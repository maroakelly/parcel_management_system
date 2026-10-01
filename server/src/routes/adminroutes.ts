import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import {
  authenticate,
  AuthRequest,
} from "../utils/authMiddleware";

const router = Router();

function checkAdmin(req: AuthRequest): boolean {
  if (!req.user) {
    return false;
  }

  return (
    req.user.role === "ADMIN" ||
    req.user.role === "SUPER_ADMIN" ||
    req.user.role === "SUPPORT"
  );
}

/*
====================================================
GET ALL PARCELS
GET /api/admin/parcels
====================================================
*/

router.get(
  "/parcels",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const parcels = await prisma.parcel.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          driver: {
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
          },
        },
      });

      return res.json({ parcels });
    } catch (error) {
      console.error("Get parcels error:", error);

      return res.status(500).json({
        message: "Unable to retrieve parcels",
      });
    }
  }
);

/*
====================================================
GET ALL DRIVERS
GET /api/admin/drivers
====================================================
*/

router.get(
  "/drivers",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const drivers = await prisma.driver.findMany({
        orderBy: {
          createdAt: "desc",
        },
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

      return res.json({ drivers });
    } catch (error) {
      console.error("Get drivers error:", error);

      return res.status(500).json({
        message: "Unable to retrieve drivers",
      });
    }
  }
);

/*
====================================================
REGISTER DRIVER
POST /api/admin/drivers/register
====================================================
*/

router.post(
  "/drivers/register",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const {
        name,
        email,
        phone,
        password,
        licenseNumber,
        vehicleNumber,
        vehicleType,
      } = req.body;

      if (
        !name ||
        !email ||
        !password ||
        !licenseNumber ||
        !vehicleNumber ||
        !vehicleType
      ) {
        return res.status(400).json({
          message: "All required driver fields must be provided",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          email: email.toLowerCase().trim(),
        },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "A user with this email already exists",
        });
      }

      const existingLicense = await prisma.driver.findFirst({
        where: {
          licenseNumber,
        },
      });

      if (existingLicense) {
        return res.status(409).json({
          message: "A driver with this license number already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const driver = await prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              name,
              email: email.toLowerCase().trim(),
              phone: phone || null,
              password: hashedPassword,
              role: "DRIVER",
              status: "ACTIVE",
            },
          });

          const newDriver = await tx.driver.create({
            data: {
              userId: user.id,
              licenseNumber,
              vehicleNumber,
              vehicleType,
              availability: true,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                  status: true,
                },
              },
            },
          });

          return newDriver;
        }
      );

      return res.status(201).json({
        message: "Driver registered successfully",
        driver,
      });
    } catch (error) {
      console.error("Register driver error:", error);

      return res.status(500).json({
        message: "Unable to register driver",
      });
    }
  }
);

/*
====================================================
ASSIGN DRIVER TO PARCEL
PATCH /api/admin/parcels/:id/assign-driver
====================================================
*/

router.patch(
  "/parcels/:id/assign-driver",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const parcelId = Number(req.params.id);
      const driverId = Number(req.body.driverId);

      if (!Number.isInteger(parcelId)) {
        return res.status(400).json({
          message: "Invalid parcel ID",
        });
      }

      if (!Number.isInteger(driverId)) {
        return res.status(400).json({
          message: "Invalid driver ID",
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

      const driver = await prisma.driver.findUnique({
        where: {
          id: driverId,
        },
        include: {
          user: true,
        },
      });

      if (!driver) {
        return res.status(404).json({
          message: "Driver not found",
        });
      }

      if (driver.user.status !== "ACTIVE") {
        return res.status(400).json({
          message: "Driver account is not active",
        });
      }

      const updatedParcel = await prisma.parcel.update({
        where: {
          id: parcelId,
        },
        data: {
          driverId,
          status: "ASSIGNED",
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          driver: {
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
          },
        },
      });

      await prisma.parcelStatusHistory.create({
        data: {
          parcelId,
          status: "ASSIGNED",
          notes: `Parcel assigned to driver ${driver.user.name}`,
        },
      });

      return res.json({
        message: "Driver assigned successfully",
        parcel: updatedParcel,
      });
    } catch (error) {
      console.error("Assign driver error:", error);

      return res.status(500).json({
        message: "Unable to assign driver",
      });
    }
  }
);

/*
====================================================
UPDATE PARCEL STATUS
PATCH /api/admin/parcels/:id/status
====================================================
*/

router.patch(
  "/parcels/:id/status",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const parcelId = Number(req.params.id);
      const { status, notes } = req.body;

      if (!Number.isInteger(parcelId)) {
        return res.status(400).json({
          message: "Invalid parcel ID",
        });
      }

      const validStatuses = [
        "PENDING",
        "ASSIGNED",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "DELIVERY_FAILED",
        "RESCHEDULED",
        "RETURNED",
        "CANCELLED",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid parcel status",
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

      const updatedParcel = await prisma.parcel.update({
        where: {
          id: parcelId,
        },
        data: {
          status,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          driver: {
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
          },
        },
      });

      await prisma.parcelStatusHistory.create({
        data: {
          parcelId,
          status,
          notes: notes || `Status changed to ${status}`,
        },
      });

      return res.json({
        message: "Parcel status updated successfully",
        parcel: updatedParcel,
      });
    } catch (error) {
      console.error("Update parcel status error:", error);

      return res.status(500).json({
        message: "Unable to update parcel status",
      });
    }
  }
);

/*
====================================================
DELETE PARCEL
DELETE /api/admin/parcels/:id
====================================================
*/

router.delete(
  "/parcels/:id",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const parcelId = Number(req.params.id);

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

      await prisma.parcelStatusHistory.deleteMany({
        where: {
          parcelId,
        },
      });

      await prisma.payment.deleteMany({
        where: {
          parcelId,
        },
      });

      await prisma.parcel.delete({
        where: {
          id: parcelId,
        },
      });

      return res.json({
        message: "Parcel deleted successfully",
      });
    } catch (error) {
      console.error("Delete parcel error:", error);

      return res.status(500).json({
        message: "Unable to delete parcel",
      });
    }
  }
);

/*
====================================================
GET CUSTOMERS
GET /api/admin/customers
====================================================
*/

router.get(
  "/customers",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const customers = await prisma.user.findMany({
        where: {
          role: "CUSTOMER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              customerParcels: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({ customers });
    } catch (error) {
      console.error("Get customers error:", error);

      return res.status(500).json({
        message: "Unable to retrieve customers",
      });
    }
  }
);

/*
====================================================
UPDATE CUSTOMER STATUS
PATCH /api/admin/customers/:id/status
====================================================
*/

router.patch(
  "/customers/:id/status",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const customerId = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isInteger(customerId)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      if (
        status !== "ACTIVE" &&
        status !== "SUSPENDED"
      ) {
        return res.status(400).json({
          message: "Invalid customer status",
        });
      }

      const customer = await prisma.user.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer || customer.role !== "CUSTOMER") {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      const updatedCustomer =
        await prisma.user.update({
          where: {
            id: customerId,
          },
          data: {
            status,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        });

      return res.json({
        message: "Customer status updated",
        customer: updatedCustomer,
      });
    } catch (error) {
      console.error(
        "Customer status error:",
        error
      );

      return res.status(500).json({
        message: "Unable to update customer status",
      });
    }
  }
);

/*
====================================================
DELETE CUSTOMER
DELETE /api/admin/customers/:id
====================================================
*/

router.delete(
  "/customers/:id",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      const customerId = Number(req.params.id);

      if (!Number.isInteger(customerId)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      const customer = await prisma.user.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer || customer.role !== "CUSTOMER") {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      await prisma.user.update({
        where: {
          id: customerId,
        },
        data: {
          status: "DELETED",
        },
      });

      return res.json({
        message: "Customer deleted successfully",
      });
    } catch (error) {
      console.error("Delete customer error:", error);

      return res.status(500).json({
        message: "Unable to delete customer",
      });
    }
  }
);

/*
====================================================
SYSTEM REPORTS
GET /api/admin/reports
====================================================
*/

router.get(
  "/reports",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      if (!checkAdmin(req)) {
        return res.status(403).json({
          message: "Admin access required",
        });
      }

      // Count customers
      const totalCustomers = await prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      });

      // Count drivers
      const totalDrivers = await prisma.driver.count();

      // Count all parcels
      const totalParcels = await prisma.parcel.count();

      // Count parcels by status
      const deliveredParcels = await prisma.parcel.count({
        where: {
          status: "DELIVERED",
        },
      });

      const pendingParcels = await prisma.parcel.count({
        where: {
          status: "PENDING",
        },
      });

      const inTransitParcels = await prisma.parcel.count({
        where: {
          status: "IN_TRANSIT",
        },
      });

      const cancelledParcels = await prisma.parcel.count({
        where: {
          status: "CANCELLED",
        },
      });

      // Calculate revenue from PAID payments
      const revenue = await prisma.payment.aggregate({
        where: {
          status: "PAID",
        },
        _sum: {
          amount: true,
        },
      });

      const totalRevenue = revenue._sum.amount ?? 0;

      // Get recent parcels
      const recentParcels = await prisma.parcel.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          trackingNumber: true,
          receiverName: true,
          price: true,
          status: true,
          createdAt: true,
        },
      });

      return res.json({
        summary: {
          totalCustomers,
          totalDrivers,
          totalParcels,
          deliveredParcels,
          pendingParcels,
          inTransitParcels,
          cancelledParcels,
          totalRevenue,
        },
        recentParcels,
      });
    } catch (error) {
      console.error("Reports error:", error);

      return res.status(500).json({
        message: "Unable to generate system reports",
      });
    }
  }
);

export default router;