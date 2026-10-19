import { Router } from "express";
import { register } from "../controllers/authController.js";

import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register",authLimiter, register);

export default router;