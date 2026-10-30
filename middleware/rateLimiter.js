import rateLimit from "express-rate-limit";

const base = { standardHeaders: true, legacyHeaders: false };
const tooMany = { success: false, message: "Too many attempts. Please try again later." };

// Counts every signup attempt, successful or not
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: tooMany,
});

// Counts only FAILED logins (status 400 and above), so a hostel full of students
// logging in successfully from one Wi-Fi network never blocks each other
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: tooMany,
});

// Counts only failed code checks
export const otpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: tooMany,
});

// Every request sends an email, so count them all
export const resendLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooMany,
});

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { success: false, message: "Too many requests. Please slow down." },
});
