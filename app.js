import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRoutes from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";

import userRoutes from "./routes/userRoutes.js";

import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import courseRoutes from "./routes/courseRoutes.js";
import universityRoutes from "./routes/universityRoutes.js";
import programmeRoutes from "./routes/programmeRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";


const app = express();

// Behind a hosting proxy (Render, Railway...), trust one hop so rate limits see the real visitor IP
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN}));
app.use(express.json({limit: "100kb"}));

// Express 5 leaves req.body undefined when a request has no JSON body
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/me", userRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api", apiLimiter);

app.use("/api/courses", courseRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/programmes", programmeRoutes);
app.use("/api/search", searchRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;