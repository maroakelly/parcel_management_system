import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import parcelRoutes from "./routes/parcelRoutes";
import adminRoutes from "./routes/adminroutes";
import paymentRoutes from "./routes/paymentRoutes";

dotenv.config();

const app = express();

// Allow the frontend to communicate with the backend
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// HOME
app.get("/", (_req, res) => {
  res.json({
    message: "Parcel Management System API is running!",
  });
});

// HEALTH CHECK
app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Server is healthy",
  });
});

// AUTHENTICATION
app.use("/api", authRoutes);

// CUSTOMER
app.use("/api", customerRoutes);

// PARCELS
app.use("/api", parcelRoutes);

// ADMIN
app.use("/api/admin", adminRoutes);

// PAYMENTS
app.use("/api", paymentRoutes);

export default app;