import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SUPPORT",
];

function hasAdminAccess(req: AuthRequest): boolean {
  return Boolean(
    req.user && ADMIN_ROLES.includes(req.user.role)
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/*
  1. INTELLIGENT ANALYTICS
  GET /api/ai/analytics
*/
router.get(
  "/analytics",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!hasAdminAccess(req)) {
        return res.status(403).json({
          message: "Administrator access required",
        });
      }

      const [
        totalParcels,
        delivered,
        pending,
        inTransit,
        failed,
        cancelled,
        totalCustomers,
        totalDrivers,
        revenue,
        statusCounts,
        recentParcels,
      ] = await Promise.all([
        prisma.parcel.count(),
        prisma.parcel.count({
          where: { status: "DELIVERED" },
        }),
        prisma.parcel.count({
          where: { status: "PENDING" },
        }),
        prisma.parcel.count({
          where: {
            status: {
              in: [
                "PICKED_UP",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
              ],
            },
          },
        }),
        prisma.parcel.count({
          where: { status: "DELIVERY_FAILED" },
        }),
        prisma.parcel.count({
          where: { status: "CANCELLED" },
        }),
        prisma.user.count({
          where: { role: "CUSTOMER" },
        }),
        prisma.driver.count(),
        prisma.payment.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }),
        prisma.parcel.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.parcel.findMany({
          orderBy: { createdAt: "desc" },
          take: 7,
          select: {
            id: true,
            trackingNumber: true,
            status: true,
            deliveryType: true,
            createdAt: true,
          },
        }),
      ]);

      const deliverySuccessRate =
        totalParcels > 0
          ? Math.round(
              (delivered / totalParcels) * 10000
            ) / 100
          : 0;

      return res.json({
        generatedAt: new Date().toISOString(),
        summary: {
          totalParcels,
          delivered,
          pending,
          inTransit,
          failed,
          cancelled,
          totalCustomers,
          totalDrivers,
          paidRevenue: revenue._sum.amount ?? 0,
          deliverySuccessRate,
        },
        parcelsByStatus: statusCounts.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        recentParcels,
      });
    } catch (error) {
      console.error("AI analytics error:", error);
      return res.status(500).json({
        message: "Unable to generate analytics",
      });
    }
  }
);

/*
  2. RULE-BASED DELIVERY ESTIMATE
  GET /api/ai/predictions/:trackingNumber
*/
router.get(
  "/predictions/:trackingNumber",
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

      const parcel = await prisma.parcel.findUnique({
  where: { trackingNumber },
  include: {
    driver: {
      select: { userId: true },
    },
    statusHistory: {
      where: { status: { } },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { createdAt: true },
    },
  },
});
      if (!parcel) {
        return res.status(404).json({
          message: "Parcel not found",
        });
      }

      const isOwner = parcel.customerId === req.user.id;
      const isAssignedDriver =
        parcel.driver?.userId === req.user.id;
      const isAdmin = hasAdminAccess(req);

      if (!isOwner && !isAssignedDriver && !isAdmin) {
        return res.status(403).json({
          message: "You cannot access this parcel estimate",
        });
      }

      if (parcel.status === "DELIVERED") {
        return res.json({
          trackingNumber,
          status: parcel.status,
          estimateAvailable: false,
          message: "This parcel has already been delivered.",
        });
      }

      if (
        [
          "DELIVERY_FAILED",
          "RETURNED",
          "CANCELLED",
        ].includes(parcel.status)
      ) {
        return res.json({
          trackingNumber,
          status: parcel.status,
          estimateAvailable: false,
          message:
            "An arrival estimate is unavailable for this parcel status.",
        });
      }

      let minDays: number;
      let maxDays: number;

      if (parcel.status === "OUT_FOR_DELIVERY") {
        minDays = 0;
        maxDays = 1;
      } else if (
        parcel.status === "PICKED_UP" ||
        parcel.status === "IN_TRANSIT"
      ) {
        minDays = 1;
        maxDays = parcel.deliveryType === "EXPRESS" ? 2 : 4;
      } else {
        minDays = parcel.deliveryType === "EXPRESS" ? 1 : 2;
        maxDays = parcel.deliveryType === "EXPRESS" ? 2 : 5;
      }

      return res.json({
        trackingNumber,
        status: parcel.status,
        estimateAvailable: true,
        estimatedArrival: {
          from: addDays(new Date(), minDays).toISOString(),
          to: addDays(new Date(), maxDays).toISOString(),
        },
        method: "Rule-based estimate; not a trained AI model",
        note:
          "Actual delivery may vary. The estimate will improve when reliable historical delivery data is available.",
      });
    } catch (error) {
      console.error("Delivery estimate error:", error);
      return res.status(500).json({
        message: "Unable to estimate delivery time",
      });
    }
  }
);

/*
  3. DELIVERY JOB RECOMMENDATIONS
  GET /api/ai/recommendations
*/
router.get(
  "/recommendations",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!hasAdminAccess(req)) {
        return res.status(403).json({
          message: "Administrator access required",
        });
      }

      const [drivers, parcels] = await Promise.all([
        prisma.driver.findMany({
          where: {
            availability: true,
            user: { status: "ACTIVE" },
          },
          select: {
            id: true,
            vehicleType: true,
            user: {
              select: { name: true },
            },
            parcels: {
              where: {
                status: {
                  in: [
                    "ASSIGNED",
                    "PICKED_UP",
                    "IN_TRANSIT",
                    "OUT_FOR_DELIVERY",
                  ],
                },
              },
              select: { id: true },
            },
          },
        }),
        prisma.parcel.findMany({
          where: {
            status: "PENDING",
            driverId: null,
          },
          orderBy: { createdAt: "asc" },
          take: 100,
          select: {
            id: true,
            trackingNumber: true,
            deliveryType: true,
            weight: true,
            createdAt: true,
            pickupAddress: true,
            deliveryAddress: true,
          },
        }),
      ]);

      const recommendations = parcels.map((parcel) => {
        const waitingHours = Math.max(
          0,
          (Date.now() - parcel.createdAt.getTime()) /
            (1000 * 60 * 60)
        );

        const urgencyScore =
          (parcel.deliveryType === "EXPRESS" ? 50 : 0) +
          Math.min(waitingHours, 48);

        const suggestedDrivers = drivers
          .map((driver) => ({
            driverId: driver.id,
            driverName: driver.user.name,
            activeJobs: driver.parcels.length,
            score:
              urgencyScore -
              driver.parcels.length * 10,
          }))
          .sort((a, b) => b.score - a.score);

        return {
          parcelId: parcel.id,
          trackingNumber: parcel.trackingNumber,
          deliveryType: parcel.deliveryType,
          waitingHours: Math.round(waitingHours),
          urgencyScore: Math.round(urgencyScore),
          suggestedDrivers: suggestedDrivers.slice(0, 3),
        };
      });

      return res.json({
        method: "Rule-based job ranking",
        availableDrivers: drivers.length,
        unassignedParcels: parcels.length,
        recommendations,
        note:
          "These are suggestions, not automatic assignments. Verify capacity and operational requirements before assigning a job.",
      });
    } catch (error) {
      console.error("Delivery recommendations error:", error);
      return res.status(500).json({
        message: "Unable to generate delivery recommendations",
      });
    }
  }
);

/*
  4. SUSPICIOUS ACTIVITY REVIEW
  GET /api/ai/suspicious-activity
*/
router.get(
  "/suspicious-activity",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!hasAdminAccess(req)) {
        return res.status(403).json({
          message: "Administrator access required",
        });
      }

      const since = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      const logs = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          action: {
            in: [
              "LOGIN_FAILED",
              "PARCEL_STATUS_CHANGED",
              "DRIVER_ASSIGNED",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
        },
      });

      const failedLoginCounts = new Map<number, number>();

      for (const log of logs) {
        if (
          log.action === "LOGIN_FAILED" &&
          log.userId !== null
        ) {
          failedLoginCounts.set(
            log.userId,
            (failedLoginCounts.get(log.userId) ?? 0) + 1
          );
        }
      }

      const alerts = logs.map((log) => {
        const attempts = log.userId === null
          ? 0
          : failedLoginCounts.get(log.userId) ?? 0;

        return {
          ...log,
          severity:
            log.action === "LOGIN_FAILED" && attempts >= 5
              ? "HIGH"
              : "REVIEW",
          reason:
            log.action === "LOGIN_FAILED"
              ? `Failed login recorded; ${attempts} recorded for this account in the last seven days.`
              : log.action === "PARCEL_STATUS_CHANGED"
                ? "Review the parcel status change."
                : "Review the driver assignment.",
        };
      });

      return res.json({
        period: "Last 7 days",
        totalAlerts: alerts.length,
        alerts,
        note:
          "Alerts require human review and do not prove malicious activity. Failed-login detection works only after login failures are recorded in audit logs.",
      });
    } catch (error) {
      console.error("Suspicious activity error:", error);
      return res.status(500).json({
        message: "Unable to retrieve suspicious activity",
      });
    }
  }
);

/*
  5. CUSTOMER SUPPORT CHATBOT
  POST /api/ai/chat
  Requires a logged-in user.
*/
router.post(
  "/chat",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Please log in to use parcel support.",
        });
      }

      const message =
        typeof req.body.message === "string"
          ? req.body.message.trim().slice(0, 1000)
          : "";

      if (!message) {
        return res.status(400).json({
          message: "Please enter a question.",
        });
      }

      const question = message.toLowerCase();
      const trackingMatch = message.match(
        /\bPKG-[A-Z0-9-]+\b/i
      );

      if (
        question.includes("track") ||
        question.includes("where is my parcel") ||
        question.includes("parcel status") ||
        trackingMatch
      ) {
        if (!trackingMatch) {
          return res.json({
            reply:
              "Please enter your parcel tracking number, for example PKG-12345678-1234. I can only show parcels belonging to your account.",
          });
        }

        const parcel = await prisma.parcel.findFirst({
          where: {
            trackingNumber: trackingMatch[0].toUpperCase(),
            customerId: req.user.id,
          },
          select: {
            trackingNumber: true,
            status: true,
            deliveryType: true,
            createdAt: true,
          },
        });

        if (!parcel) {
          return res.json({
            reply:
              "I could not find that parcel under your account. Please check the tracking number or open My Parcels while signed in.",
          });
        }

        return res.json({
          reply:
            `Parcel ${parcel.trackingNumber} is currently ${parcel.status.replace(/_/g, " ").toLowerCase()}. ` +
            `Delivery type: ${parcel.deliveryType.toLowerCase()}.`,
          parcel,
        });
      }

      if (
        question.includes("payment") ||
        question.includes("m-pesa") ||
        question.includes("mpesa") ||
        question.includes("pay")
      ) {
        return res.json({
          reply:
            "Your system supports M-PESA, cash on delivery, card, and online payment methods. Check the payment status shown for your parcel. Never share your M-PESA PIN in this chat.",
        });
      }

      if (
        question.includes("delivery time") ||
        question.includes("when will") ||
        question.includes("how long")
      ) {
        return res.json({
          reply:
            "Delivery time depends on the parcel status and delivery type. Provide your tracking number and ask for its estimated arrival, or check Track Parcel in your dashboard.",
        });
      }

      if (
        question.includes("hello") ||
        question.includes("hi") ||
        question.includes("hey")
      ) {
        return res.json({
          reply:
            "Hello! I can help with parcel tracking, delivery estimates, payment methods, and common parcel questions. What would you like to know?",
        });
      }

      return res.json({
        reply:
          "I can help with parcel tracking, delivery estimates, parcel statuses, and payment methods. Try asking “How do I track my parcel?” or enter your tracking number.",
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      return res.status(500).json({
        message: "The support chatbot is temporarily unavailable",
      });
    }
  }
);

export default router;