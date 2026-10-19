import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRoutes from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";



const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN}));
app.use(express.json({limit: "100kb"}));

app.use("/api/auth", authRoutes);

app.use("/api/health", healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;