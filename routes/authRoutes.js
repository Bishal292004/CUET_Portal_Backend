import { Router } from "express";
import {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/authController.js";
import {
  registerLimiter,
  loginLimiter,
  otpLimiter,
  resendLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-verification", resendLimiter, resendVerificationEmail);

export default router;
