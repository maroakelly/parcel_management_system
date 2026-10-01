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

/*
  CORS
  The frontend and backend are hosted on different Vercel domains.
*/
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

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