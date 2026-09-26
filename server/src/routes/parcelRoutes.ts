import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

/*
  Generate a unique tracking number
*/
const generateTrackingNumber = () => {
  const timestamp = Date.now().toString().slice(-8);

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `PKG-${timestamp}-${random}`;
};

/*
  Calculate parcel delivery price
*/
const calculatePrice = (
  weight: number,
  deliveryType: string
) => {
  let price = 200;

  if (weight > 1) {
    price += (weight - 1) * 50;
  }

  if (deliveryType === "EXPRESS") {
    price *= 1.5;
  }

  return Math.round(price * 100) / 100;
};

/*
  CREATE PARCEL
  POST /api/parcels
*/
router.post(
  "/parcels",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const {
        receiverName,
        receiverPhone,
        pickupAddress,
        deliveryAddress,
        parcelType,
        weight,
        deliveryType,
      } = req.body;

      /*
        Validate required fields
      */
      if (
        !receiverName ||
        !receiverPhone ||
        !pickupAddress ||
        !deliveryAddress ||
        !parcelType ||
        weight === undefined ||
        !deliveryType
      ) {
        return res.status(400).json({
          message: "All parcel fields are required",
        });
      }

      /*
        Convert weight to number
      */
      const parcelWeight = Number(weight);

      if (
        Number.isNaN(parcelWeight) ||
        parcelWeight <= 0
      ) {
        return res.status(400).json({
          message: "Weight must be greater than 0",
        });
      }

      /*
        Validate delivery type
      */
      if (
        deliveryType !== "STANDARD" &&
        deliveryType !== "EXPRESS"
      ) {
        return res.status(400).json({
          message: "Invalid delivery type",
        });
      }

      /*
        Get the logged-in customer.
        This provides the sender's name and phone number.
      */
      const customer = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer account not found",
        });
      }

      /*
        Calculate parcel price
      */
      const price = calculatePrice(
        parcelWeight,
        deliveryType
      );

      /*
        Generate a unique tracking number
      */
      let trackingNumber =
        generateTrackingNumber();

      let existingParcel =
        await prisma.parcel.findUnique({
          where: {
            trackingNumber,
          },
        });

      while (existingParcel) {
        trackingNumber =
          generateTrackingNumber();

        existingParcel =
          await prisma.parcel.findUnique({
            where: {
              trackingNumber,
            },
          });
      }

      /*
        Create parcel
      */
      const parcel = await prisma.parcel.create({
        data: {
          trackingNumber,

          customerId: customer.id,

          /*
            Sender details come from the
            authenticated customer's account.
          */
          senderName: customer.name,
          senderPhone: customer.phone || "",

          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),

          pickupAddress: pickupAddress.trim(),
          deliveryAddress: deliveryAddress.trim(),

          parcelType: parcelType.trim(),

          weight: parcelWeight,

          deliveryType,

          price,

          status: "PENDING",
        },
      });

      /*
        Create initial parcel status history.

        NOTE:
        changedBy was removed because it does not
        exist in the current Prisma schema.
      */
      await prisma.parcelStatusHistory.create({
        data: {
          parcelId: parcel.id,
          status: "PENDING",
          notes: "Parcel created by customer",
        },
      });

      /*
        Create notification for the customer
      */
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          parcelId: parcel.id,
          title: "Parcel Created",
          message: `Your parcel ${trackingNumber} has been created successfully.`,
        },
      });

      return res.status(201).json({
        message: "Parcel created successfully",
        parcel,
      });
    } catch (error) {
      console.error(
        "Create parcel error:",
        error
      );

      return res.status(500).json({
        message: "Unable to create parcel",
      });
    }
  }
);

/*
  GET CUSTOMER PARCELS
  GET /api/parcels/my
*/
router.get(
  "/parcels/my",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const parcels =
        await prisma.parcel.findMany({
          where: {
            customerId: req.user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json({
        parcels,
      });
    } catch (error) {
      console.error(
        "Get customer parcels error:",
        error
      );

      return res.status(500).json({
        message: "Unable to retrieve parcels",
      });
    }
  }
);

/*
  TRACK PARCEL
  GET /api/parcels/track/:trackingNumber
*/
router.get(
  "/parcels/track/:trackingNumber",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const trackingNumber =
        typeof req.params.trackingNumber ===
        "string"
          ? req.params.trackingNumber.trim()
          : "";

      if (!trackingNumber) {
        return res.status(400).json({
          message: "Tracking number is required",
        });
      }

      const parcel =
        await prisma.parcel.findUnique({
          where: {
            trackingNumber,
          },
          include: {
            statusHistory: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!parcel) {
        return res.status(404).json({
          message:
            "Parcel with this tracking number was not found",
        });
      }

      /*
        Customers can only track their own parcels.
      */
      if (
        parcel.customerId !==
        req.user.id
      ) {
        return res.status(403).json({
          message:
            "You do not have permission to track this parcel",
        });
      }

      return res.json({
        parcel,
      });
    } catch (error) {
      console.error(
        "Track parcel error:",
        error
      );

      return res.status(500).json({
        message: "Unable to track parcel",
      });
    }
  }
);

export default router;