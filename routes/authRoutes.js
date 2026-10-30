import { Router } from "express";
import { register, login, verifyEmail, resendVerificationEmail} from "../controllers/authController.js";

import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register",authLimiter, register);
router.post("/login", authLimiter, login);
//verify email using otp
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerificationEmail);

export default router;