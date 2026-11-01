import rateLimit from "express-rate-limit";

const base = { standardHeaders: true, legacyHeaders: false };
const tooMany = { success: false, message: "Too many attempts. Please try again later." };

// Every request can send an email, so count them all
export const forgotLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooMany,
});

// Count only failed attempts (status 400 and above), so real users are not blocked
export const resetLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: tooMany,
});

export const changePasswordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: tooMany,
});
