import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

/*
  Default pricing
  Standard minimum: KSh 1
  Default rate: KSh 1 per kg
  Express multiplier: 1.5
*/
const DEFAULT_PRICE_PER_KG = 1;
const DEFAULT_EXPRESS_MULTIPLIER = 1.5;

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
  Calculate parcel delivery price.
  Standard delivery cannot cost less than KSh 1.
*/
const calculatePrice = (
  weight: number,
  deliveryType: string,
  pricePerKg: number,
  expressMultiplier: number
): number => {
  const basePrice = Math.max(1, weight * pricePerKg);

  const finalPrice =
    deliveryType === "EXPRESS"
      ? basePrice * expressMultiplier
      : basePrice;

  return Math.round(finalPrice * 100) / 100;
};

/*
  GET CUSTOMER PRICING
  GET /api/pricing

  Publicly readable so the customer form can display
  the current administrator-configured pricing.
*/
router.get("/pricing", async (_req, res) => {
  try {
    const pricing = await prisma.pricingSetting.upsert({
      where: {
        id: 1,
      },
      update: {},
      create: {
        id: 1,
        pricePerKg: DEFAULT_PRICE_PER_KG,
        expressMultiplier: DEFAULT_EXPRESS_MULTIPLIER,
      },
    });

    return res.status(200).json({
      pricing: {
        pricePerKg: pricing.pricePerKg,
        expressMultiplier: pricing.expressMultiplier,
      },
    });
  } catch (error) {
    console.error("Get customer pricing error:", error);

    return res.status(500).json({
      message: "Unable to retrieve pricing",
    });
  }
});

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
        Validate text fields
      */
      if (
        typeof receiverName !== "string" ||
        typeof receiverPhone !== "string" ||
        typeof pickupAddress !== "string" ||
        typeof deliveryAddress !== "string" ||
        typeof parcelType !== "string"
      ) {
        return res.status(400).json({
          message: "Parcel details must be valid text",
        });
      }

      if (
        !receiverName.trim() ||
        !receiverPhone.trim() ||
        !pickupAddress.trim() ||
        !deliveryAddress.trim() ||
        !parcelType.trim()
      ) {
        return res.status(400).json({
          message: "Parcel fields cannot be empty",
        });
      }

      /*
        Convert and validate weight
      */
      const parcelWeight = Number(weight);

      if (
        !Number.isFinite(parcelWeight) ||
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
        Get the logged-in customer
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
        Get or initialize administrator pricing.
        The server determines the price; clients cannot
        submit their own trusted price.
      */
      const pricing = await prisma.pricingSetting.upsert({
        where: {
          id: 1,
        },
        update: {},
        create: {
          id: 1,
          pricePerKg: DEFAULT_PRICE_PER_KG,
          expressMultiplier: DEFAULT_EXPRESS_MULTIPLIER,
        },
      });

      /*
        Calculate the authoritative parcel price
      */
      const price = calculatePrice(
        parcelWeight,
        deliveryType,
        pricing.pricePerKg,
        pricing.expressMultiplier
      );

      /*
        Generate a unique tracking number
      */
      let trackingNumber = generateTrackingNumber();

      let existingParcel = await prisma.parcel.findUnique({
        where: {
          trackingNumber,
        },
      });

      while (existingParcel) {
        trackingNumber = generateTrackingNumber();

        existingParcel = await prisma.parcel.findUnique({
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
        Create initial parcel status history
      */
      await prisma.parcelStatusHistory.create({
        data: {
          parcelId: parcel.id,
          status: "PENDING",
          notes: "Parcel created by customer",
        },
      });

      /*
        Create customer notification
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
      console.error("Create parcel error:", error);

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

      const parcels = await prisma.parcel.findMany({
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
      console.error("Get customer parcels error:", error);

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
        typeof req.params.trackingNumber === "string"
          ? req.params.trackingNumber.trim()
          : "";

      if (!trackingNumber) {
        return res.status(400).json({
          message: "Tracking number is required",
        });
      }

      const parcel = await prisma.parcel.findUnique({
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
          message: "Parcel with this tracking number was not found",
        });
      }

      /*
        Customers can only track their own parcels
      */
      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message: "You do not have permission to track this parcel",
        });
      }

      return res.json({
        parcel,
      });
    } catch (error) {
      console.error("Track parcel error:", error);

      return res.status(500).json({
        message: "Unable to track parcel",
      });
    }
  }
);

export default router;