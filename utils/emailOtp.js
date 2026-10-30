import { createHmac, randomInt } from "node:crypto";

const secret = process.env.EMAIL_OTP_SECRET;

if (!secret) {
  throw new Error("Missing EMAIL_OTP_SECRET environment variable.");
}



export function hashEmailOtp(otp) {
  return createHmac("sha256", secret)
    .update(otp)
    .digest("hex");
}

export function createEmailOtp() {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpHash = hashEmailOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  return { otp, otpHash, expiresAt };
}