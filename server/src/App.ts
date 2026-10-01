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

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

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