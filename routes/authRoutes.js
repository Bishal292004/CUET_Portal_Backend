import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import { forgotPasswordSchema, resetPasswordSchema } from "../validators/passwordValidators.js";
import { forgotLimiter, resetLimiter } from "../middleware/passwordLimiters.js";
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
router.post("/forgot-password", forgotLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
