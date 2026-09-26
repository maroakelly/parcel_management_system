import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

/*
  GET PAYMENT FOR A PARCEL
*/
router.get(
  "/payments/parcel/:parcelId",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const parcelId = Number(req.params.parcelId);

      if (!Number.isInteger(parcelId)) {
        return res.status(400).json({
          message: "Invalid parcel ID",
        });
      }

      const parcel = await prisma.parcel.findUnique({
        where: {
          id: parcelId,
        },
        include: {
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!parcel) {
        return res.status(404).json({
          message: "Parcel not found",
        });
      }

      return res.json({
        parcel: {
          id: parcel.id,
          trackingNumber: parcel.trackingNumber,
          price: parcel.price,
          status: parcel.status,
        },
        payments: parcel.payments,
      });
    } catch (error) {
      console.error(
        "Get parcel payment error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to retrieve payment information",
      });
    }
  }
);

/*
  CREATE CASH ON DELIVERY PAYMENT
*/
router.post(
  "/payments/cash",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const parcelId = Number(req.body.parcelId);

      if (!Number.isInteger(parcelId)) {
        return res.status(400).json({
          message: "Invalid parcel ID",
        });
      }

      const parcel = await prisma.parcel.findUnique({
        where: {
          id: parcelId,
        },
      });

      if (!parcel) {
        return res.status(404).json({
          message: "Parcel not found",
        });
      }

      /*
        Make sure the parcel belongs to
        the logged-in customer.
      */
      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message:
            "You are not authorized to pay for this parcel",
        });
      }

      /*
        Create payment and connect it
        to the logged-in customer.
      */
      const payment = await prisma.payment.create({
        data: {
          parcel: {
            connect: {
              id: parcel.id,
            },
          },
          user: {
            connect: {
              id: req.user.id,
            },
          },
          amount: parcel.price,
          method: "CASH_ON_DELIVERY",
          status: "PENDING",
        },
      });

      return res.status(201).json({
        message:
          "Cash on delivery payment created",
        payment,
      });
    } catch (error) {
      console.error(
        "Cash payment error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to create cash payment",
      });
    }
  }
);

/*
  CREATE M-PESA PAYMENT
*/
router.post(
  "/payments/online",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const parcelId = Number(req.body.parcelId);
      const phoneNumber = String(
        req.body.phoneNumber || ""
      ).trim();

      if (!Number.isInteger(parcelId)) {
        return res.status(400).json({
          message: "Invalid parcel ID",
        });
      }

      if (!phoneNumber) {
        return res.status(400).json({
          message:
            "Phone number is required",
        });
      }

      const parcel = await prisma.parcel.findUnique({
        where: {
          id: parcelId,
        },
      });

      if (!parcel) {
        return res.status(404).json({
          message: "Parcel not found",
        });
      }

      /*
        Make sure the parcel belongs to
        the logged-in customer.
      */
      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message:
            "You are not authorized to pay for this parcel",
        });
      }

      /*
        Create M-Pesa payment and connect it
        to the logged-in customer.
      */
      const payment = await prisma.payment.create({
        data: {
          parcel: {
            connect: {
              id: parcel.id,
            },
          },
          user: {
            connect: {
              id: req.user.id,
            },
          },
          amount: parcel.price,
          method: "MPESA",
          status: "PENDING",
          phoneNumber,
        },
      });

      return res.status(201).json({
        message:
          "M-Pesa payment request created",
        payment,
      });
    } catch (error) {
      console.error(
        "Online payment error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to create online payment",
      });
    }
  }
);

/*
  GET CUSTOMER PAYMENT HISTORY
*/
router.get(
  "/payments/history",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const payments =
        await prisma.payment.findMany({
          where: {
            userId: req.user.id,
          },
          include: {
            parcel: {
              select: {
                id: true,
                trackingNumber: true,
                status: true,
                price: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json({
        payments,
      });
    } catch (error) {
      console.error(
        "Payment history error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to retrieve payment history",
      });
    }
  }
);

export default router;