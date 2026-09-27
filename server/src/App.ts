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

const corsOptions = {
  origin: [
    "https://parcel-management-system-lovat.vercel.app",
    "http://localhost:5173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "Parcel Management System API is running!",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Server is healthy",
  });
});

app.use("/api", authRoutes);
app.use("/api", customerRoutes);
app.use("/api", parcelRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", paymentRoutes);

export default app;