import { Router } from "express";
import prisma from "../config/prisma";
import { authenticate, AuthRequest } from "../utils/authMiddleware";
import { notifyParcelBooked } from "../utils/recieverNotifications";

const router = Router();

const DEFAULT_PRICE_PER_KG = 1;
const DEFAULT_EXPRESS_MULTIPLIER = 1.5;
const TRACKING_ATTEMPTS = 5;

const generateTrackingNumber = (): string => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PKG-${timestamp}-${random}`;
};

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

/* GET /api/pricing */
router.get("/pricing", async (_req, res) => {
  try {
    const pricing = await prisma.pricingSetting.upsert({
      where: { id: 1 },
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

/* POST /api/parcels */
router.post("/parcels", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      receiverName,
      receiverEmail,
      receiverPhone,
      pickupAddress,
      deliveryAddress,
      parcelType,
      weight,
      deliveryType,
    } = req.body;

    if (
      !receiverName ||
      !receiverEmail ||
      !receiverPhone ||
      !pickupAddress ||
      !deliveryAddress ||
      !parcelType ||
      weight === undefined ||
      !deliveryType
    ) {
      return res.status(400).json({
        message:
          "All parcel fields, including receiver email, are required",
      });
    }

    if (
      typeof receiverName !== "string" ||
      typeof receiverEmail !== "string" ||
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

    const normalizedReceiverEmail =
      receiverEmail.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedReceiverEmail
      )
    ) {
      return res.status(400).json({
        message: "Please provide a valid receiver email address",
      });
    }

    const parcelWeight = Number(weight);

    if (!Number.isFinite(parcelWeight) || parcelWeight <= 0) {
      return res.status(400).json({
        message: "Weight must be greater than 0",
      });
    }

    if (
      deliveryType !== "STANDARD" &&
      deliveryType !== "EXPRESS"
    ) {
      return res.status(400).json({
        message: "Invalid delivery type",
      });
    }

    console.log("[POST /parcels] Looking up customer");

    const customer = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    console.log("[POST /parcels] Loading pricing");

    const pricing = await prisma.pricingSetting.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        pricePerKg: DEFAULT_PRICE_PER_KG,
        expressMultiplier: DEFAULT_EXPRESS_MULTIPLIER,
      },
    });

    const price = calculatePrice(
      parcelWeight,
      deliveryType,
      pricing.pricePerKg,
      pricing.expressMultiplier
    );

    console.log("[POST /parcels] Generating tracking number");

    let trackingNumber = "";
    let foundUniqueNumber = false;

    for (
      let attempt = 0;
      attempt < TRACKING_ATTEMPTS;
      attempt++
    ) {
      const candidate = generateTrackingNumber();

      const existingParcel = await prisma.parcel.findUnique({
        where: { trackingNumber: candidate },
        select: { id: true },
      });

      if (!existingParcel) {
        trackingNumber = candidate;
        foundUniqueNumber = true;
        break;
      }
    }

    if (!foundUniqueNumber) {
      return res.status(503).json({
        message:
          "Could not generate a tracking number. Please try again.",
      });
    }

    console.log("[POST /parcels] Saving parcel");

    const parcel = await prisma.parcel.create({
      data: {
        trackingNumber,
        customerId: customer.id,
        senderName: customer.name,
        senderPhone: customer.phone || "",
        receiverName: receiverName.trim(),
        receiverEmail: normalizedReceiverEmail,
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

    console.log("[POST /parcels] Saving initial status history");

    await prisma.parcelStatusHistory.create({
      data: {
        parcelId: parcel.id,
        status: "PENDING",
        notes: "Parcel created by customer",
      },
    });

    console.log("[POST /parcels] Saving in-app notification");

    await prisma.notification.create({
      data: {
        userId: req.user.id,
        parcelId: parcel.id,
        title: "Parcel Created",
        message:
          `Your parcel ${trackingNumber} has been created successfully.`,
      },
    });

    /*
     * Respond before sending the receiver email/SMS.
     */
    res.status(201).json({
      message: "Parcel created successfully",
      parcel,
    });

    void Promise.resolve()
      .then(() =>
        notifyParcelBooked({
          name: parcel.receiverName,
          email: parcel.receiverEmail ?? undefined,
          phone: parcel.receiverPhone,
          trackingNumber: parcel.trackingNumber,
          deliveryAddress: parcel.deliveryAddress,
        })
      )
      .catch((notificationError) => {
        console.error(
          "Receiver booking notification failed:",
          notificationError
        );
      });

    console.log("[POST /parcels] Response sent");
  } catch (error) {
    console.error("Create parcel error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Unable to create parcel",
      });
    }
  }
});

/* GET /api/parcels/my */
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
        where: { customerId: req.user.id },
        orderBy: { createdAt: "desc" },
      });

      return res.json({ parcels });
    } catch (error) {
      console.error("Get customer parcels error:", error);
      return res.status(500).json({
        message: "Unable to retrieve parcels",
      });
    }
  }
);

/* GET /api/parcels/track/:trackingNumber */
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
        where: { trackingNumber },
        include: {
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!parcel) {
        return res.status(404).json({
          message:
            "Parcel with this tracking number was not found",
        });
      }

      if (parcel.customerId !== req.user.id) {
        return res.status(403).json({
          message:
            "You do not have permission to track this parcel",
        });
      }

      return res.json({ parcel });
    } catch (error) {
      console.error("Track parcel error:", error);
      return res.status(500).json({
        message: "Unable to track parcel",
      });
    }
  }
);

export default router;