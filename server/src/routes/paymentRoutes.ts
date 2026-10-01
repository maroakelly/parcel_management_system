import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";
import { initiateSTKPush } from "../mpesaservice";

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

      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message:
            "You are not authorized to pay for this parcel",
        });
      }

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
  CREATE M-PESA STK PUSH PAYMENT
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
          message: "Phone number is required",
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

      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message:
            "You are not authorized to pay for this parcel",
        });
      }

      /*
        Create the payment first.
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

      /*
        Send STK Push to the customer's phone.
      */
      const stkResponse = await initiateSTKPush(
        phoneNumber,
        Number(parcel.price),
        parcel.trackingNumber,
        `Payment for parcel ${parcel.trackingNumber}`
      );

      /*
        Save the CheckoutRequestID so that
        the callback can identify this payment.
      */
      if (stkResponse.CheckoutRequestID) {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            transactionId:
              stkResponse.CheckoutRequestID,
          },
        });
      }

      return res.status(201).json({
        message:
          stkResponse.CustomerMessage ||
          "M-Pesa payment request sent. Please check your phone.",
        paymentId: payment.id,
        checkoutRequestId:
          stkResponse.CheckoutRequestID,
        merchantRequestId:
          stkResponse.MerchantRequestID,
        responseCode:
          stkResponse.ResponseCode,
      });
    } catch (error) {
      console.error(
        "M-Pesa STK Push error:",
        error
      );

      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to initiate M-Pesa payment",
      });
    }
  }
);

/*
  M-PESA CALLBACK
  Daraja calls this endpoint after
  the customer completes or cancels payment.
*/
router.post(
  "/payments/mpesa/callback",
  async (req, res) => {
    try {
      console.log(
        "M-Pesa callback received:",
        JSON.stringify(req.body, null, 2)
      );

      const callback =
        req.body?.Body?.stkCallback;

      if (!callback) {
        return res.json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      const checkoutRequestId =
        callback.CheckoutRequestID;

      if (!checkoutRequestId) {
        return res.json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      const payment =
        await prisma.payment.findFirst({
          where: {
            transactionId: checkoutRequestId,
          },
        });

      if (!payment) {
        console.error(
          "Payment not found for CheckoutRequestID:",
          checkoutRequestId
        );

        return res.json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
        ResultCode 0 means the M-Pesa
        transaction was successful.
      */
      if (callback.ResultCode === 0) {
        const metadata =
          callback.CallbackMetadata?.Item || [];

        const receiptItem = metadata.find(
          (item: any) =>
            item.Name ===
            "MpesaReceiptNumber"
        );

        const phoneItem = metadata.find(
          (item: any) =>
            item.Name === "PhoneNumber"
        );

        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "PAID",
            mpesaReceiptNumber:
              receiptItem?.Value
                ? String(receiptItem.Value)
                : undefined,
            phoneNumber:
              phoneItem?.Value
                ? String(phoneItem.Value)
                : payment.phoneNumber,
          },
        });

        console.log(
          "M-Pesa payment completed:",
          checkoutRequestId
        );
      } else {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "FAILED",
            failureReason:
              callback.ResultDesc ||
              "M-Pesa payment failed",
          },
        });

        console.log(
          "M-Pesa payment failed:",
          callback.ResultDesc
        );
      }

      return res.json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    } catch (error) {
      console.error(
        "M-Pesa callback error:",
        error
      );

      /*
        Always acknowledge the callback so
        Daraja receives a valid response.
      */
      return res.json({
        ResultCode: 0,
        ResultDesc: "Accepted",
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