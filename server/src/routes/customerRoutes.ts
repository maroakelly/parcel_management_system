import { Router } from "express";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

/*
  GET CUSTOMER DASHBOARD
  Returns statistics and recent parcels
*/
router.get(
  "/customer/dashboard",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const customerId = req.user.id;

      // Get total parcels
      const totalParcels = await prisma.parcel.count({
        where: {
          customerId,
        },
      });

      // Get active parcels
      const activeParcels = await prisma.parcel.count({
        where: {
          customerId,
          status: {
            in: [
              "PENDING",
              "ASSIGNED",
              "PICKED_UP",
              "IN_TRANSIT",
              "OUT_FOR_DELIVERY",
            ],
          },
        },
      });

      // Get delivered parcels
      const deliveredParcels = await prisma.parcel.count({
        where: {
          customerId,
          status: "DELIVERED",
        },
      });

      // Get pending parcels
      const pendingParcels = await prisma.parcel.count({
        where: {
          customerId,
          status: "PENDING",
        },
      });

      // Get recent parcels
      const recentParcels = await prisma.parcel.findMany({
        where: {
          customerId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          trackingNumber: true,
          receiverName: true,
          deliveryAddress: true,
          deliveryType: true,
          weight: true,
          price: true,
          status: true,
          createdAt: true,
        },
      });

      return res.json({
        statistics: {
          totalParcels,
          activeParcels,
          deliveredParcels,
          pendingParcels,
        },
        recentParcels,
      });
    } catch (error) {
      console.error(
        "Customer dashboard error:",
        error
      );

      return res.status(500).json({
        message: "Unable to load customer dashboard",
      });
    }
  }
);
/*
  GET CUSTOMER PARCELS
  Returns all parcels belonging to the logged-in customer
*/
router.get(
  "/customer/parcels",
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
        select: {
          id: true,
          trackingNumber: true,
          price: true,
          status: true,
        },
      });

      return res.json({
        parcels,
      });
    } catch (error) {
      console.error(
        "Customer parcels error:",
        error
      );

      return res.status(500).json({
        message: "Unable to load customer parcels",
      });
    }
  }
);

export default router;