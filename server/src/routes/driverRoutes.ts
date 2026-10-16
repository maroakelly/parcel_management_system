import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

const allowedTransitions: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["RESCHEDULED", "RETURNED"],
  RESCHEDULED: ["PICKED_UP"],
};

function getDriverUserId(req: AuthRequest): number | null {
  const id = Number(req.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getDriverProfile(userId: number) {
  return prisma.driver.findUnique({
    where: { userId },
    select: { id: true },
  });
}

/*
 GET /api/driver/dashboard
 Return only the logged-in driver's assigned parcels.
*/
router.get(
  "/dashboard",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "DRIVER") {
        return res.status(403).json({
          message: "Driver access required.",
        });
      }

      const userId = getDriverUserId(req);
      if (!userId) {
        return res.status(401).json({
          message: "Invalid user session.",
        });
      }

      const driver = await prisma.driver.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      if (!driver || driver.user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "Active driver account required.",
        });
      }

      const parcels = await prisma.parcel.findMany({
        where: { driverId: driver.id },
        orderBy: { updatedAt: "desc" },
        include: {
          payments: {
            select: {
              amount: true,
              method: true,
              status: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              status: true,
              notes: true,
              createdAt: true,
            },
          },
        },
      });

      const count = (status: string) =>
        parcels.filter((p) => p.status === status).length;

      return res.json({
        driver: {
          id: driver.id,
          name: driver.user.name,
          email: driver.user.email,
          phone: driver.user.phone,
          licenseNumber: driver.licenseNumber,
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          availability: driver.availability,
        },
        summary: {
          total: parcels.length,
          assigned: count("ASSIGNED"),
          pickedUp: count("PICKED_UP"),
          inTransit: count("IN_TRANSIT"),
          outForDelivery: count("OUT_FOR_DELIVERY"),
          delivered: count("DELIVERED"),
          failed: count("DELIVERY_FAILED"),
        },
        parcels,
      });
    } catch (error) {
      console.error("Driver dashboard error:", error);
      return res.status(500).json({
        message: "Unable to load driver dashboard.",
      });
    }
  }
);

/*
 PATCH /api/driver/parcels/:id/status
 Update only a parcel assigned to the logged-in driver.
*/
router.patch(
  "/parcels/:id/status",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "DRIVER") {
        return res.status(403).json({
          message: "Driver access required.",
        });
      }

      const userId = getDriverUserId(req);
      const parcelId = Number(req.params.id);
      const { status, notes } = req.body ?? {};

      if (
        !userId ||
        !Number.isInteger(parcelId) ||
        parcelId < 1
      ) {
        return res.status(400).json({
          message: "Invalid driver or parcel ID.",
        });
      }

      const driver = await getDriverProfile(userId);
      if (!driver) {
        return res.status(403).json({
          message: "Driver profile not found.",
        });
      }

      const parcel = await prisma.parcel.findFirst({
        where: {
          id: parcelId,
          driverId: driver.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!parcel) {
        return res.status(404).json({
          message: "Parcel not found in your assigned deliveries.",
        });
      }

      const validNextStatuses =
        allowedTransitions[parcel.status] ?? [];

      if (
        typeof status !== "string" ||
        !validNextStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: `Cannot change status from ${parcel.status} to ${String(status)}.`,
          allowedStatuses: validNextStatuses,
        });
      }

      if (
        status === "DELIVERY_FAILED" &&
        (typeof notes !== "string" || !notes.trim())
      ) {
        return res.status(400).json({
          message: "Provide a reason for the failed delivery.",
        });
      }

      const safeNotes =
        typeof notes === "string" ? notes.trim().slice(0, 500) : "";

      const updatedParcel = await prisma.$transaction(
        async (tx) => {
          // Recheck ownership and previous status before changing it.
          const update = await tx.parcel.updateMany({
            where: {
              id: parcel.id,
              driverId: driver.id,
              status: parcel.status as never,
            },
            data: {
              status: status as never,
            },
          });

          if (update.count !== 1) {
            throw new Error("PARCEL_STATUS_CHANGED");
          }

          await tx.parcelStatusHistory.create({
            data: {
              parcelId: parcel.id,
              status: status as never,
              notes:
                safeNotes ||
                `Driver updated status to ${status}.`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId,
              action: "DRIVER_UPDATED_PARCEL_STATUS",
              entity: "Parcel",
              entityId: parcel.id,
            },
          });

          return tx.parcel.findUnique({
            where: { id: parcel.id },
            include: {
              statusHistory: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          });
        }
      );

      return res.json({
        message: "Delivery status updated successfully.",
        parcel: updatedParcel,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PARCEL_STATUS_CHANGED"
      ) {
        return res.status(409).json({
          message: "The parcel status changed. Refresh and try again.",
        });
      }

      console.error("Driver status update error:", error);
      return res.status(500).json({
        message: "Unable to update delivery status.",
      });
    }
  }
);

/*
 PATCH /api/driver/availability
 Set driver availability to available or busy.
*/
router.patch(
  "/availability",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== "DRIVER") {
        return res.status(403).json({
          message: "Driver access required.",
        });
      }

      const userId = getDriverUserId(req);
      const { availability } = req.body ?? {};

      if (
        !userId ||
        typeof availability !== "boolean"
      ) {
        return res.status(400).json({
          message: "Availability must be true or false.",
        });
      }

      const driver = await prisma.driver.findUnique({
        where: { userId },
        include: { user: { select: { status: true } } },
      });

      if (!driver || driver.user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "Active driver account required.",
        });
      }

      const updated = await prisma.driver.update({
        where: { id: driver.id },
        data: { availability },
        select: {
          availability: true,
        },
      });

      return res.json({
        message: "Availability updated.",
        availability: updated.availability,
      });
    } catch (error) {
      console.error("Driver availability error:", error);
      return res.status(500).json({
        message: "Unable to update availability.",
      });
    }
  }
);

export default router;