import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .regex(EMAIL_REGEX, "Please enter a valid email address.");

// bcrypt only reads the first 72 bytes, so longer passwords are refused instead of silently cut
const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .refine((v) => Buffer.byteLength(v) <= 72, { message: "Password is too long." });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().regex(/^\d{6}$/, "The code must be six digits."),
  newPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(200),
  newPassword,
});
