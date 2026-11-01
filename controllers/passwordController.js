import bcrypt from "bcrypt";
import { timingSafeEqual } from "node:crypto";
import { User } from "../models/index.js";
import { sendEmail } from "../utils/email.js";
import { createEmailOtp, hashEmailOtp } from "../utils/emailOtp.js";
import { signToken } from "../utils/token.js";

const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // between two codes
const LOCKED_COOLDOWN_MS = 15 * 60 * 1000; // after a code has been used up by wrong guesses

const RESET_FIELDS = {
  passwordResetOtpHash: 1,
  passwordResetOtpExpiresAt: 1,
  passwordResetOtpLastSentAt: 1,
};

// Emails are sent after the response, so the response time never reveals whether an address exists
function sendInBackground(message) {
  sendEmail(message).catch((error) => console.error("Email failed:", error.message));
}

function passwordChangedNotice(to) {
  return {
    to,
    subject: "Your CUET PG Portal password was changed",
    text:
      "The password for your CUET PG Portal account was just changed. " +
      "If this was you, no action is needed. If it was not, reset your password straight away.",
  };
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const now = Date.now();
    const { otp, otpHash, expiresAt } = createEmailOtp();

    // One database operation both checks the waiting time and stores the new code.
    // Only verified, active accounts can reset. An exhausted code earns a longer wait.
    const user = await User.findOneAndUpdate(
      {
        email,
        emailVerified: true,
        isActive: true,
        $or: [
          { passwordResetOtpLastSentAt: { $exists: false } },
          {
            passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
            passwordResetOtpLastSentAt: { $lte: new Date(now - RESEND_COOLDOWN_MS) },
          },
          {
            passwordResetOtpAttempts: { $gte: MAX_OTP_ATTEMPTS },
            passwordResetOtpLastSentAt: { $lte: new Date(now - LOCKED_COOLDOWN_MS) },
          },
        ],
      },
      {
        $set: {
          passwordResetOtpHash: otpHash,
          passwordResetOtpExpiresAt: expiresAt,
          passwordResetOtpLastSentAt: new Date(now),
          passwordResetOtpAttempts: 0,
        },
      },
      { returnDocument: "after" }
    );

    if (user) {
      sendInBackground({
        to: user.email,
        subject: "Reset your CUET PG Portal password",
        text:
          `Your password reset code is ${otp}. It expires in 10 minutes. ` +
          "If you did not ask for this, ignore this email: your password has not changed.",
      });
    }

    // The same answer whether or not the address has an account
    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset code has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;

    const invalidCode = () =>
      res.status(400).json({ success: false, message: "Reset code is invalid or expired." });
    const tooManyAttempts = () =>
      res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new code in a few minutes.",
      });

    // Use up ONE attempt atomically before looking at the code, so parallel guesses
    // can never get more than 5 tries in total
    const claimed = await User.findOneAndUpdate(
      {
        email,
        emailVerified: true,
        isActive: true,
        passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
        passwordResetOtpExpiresAt: { $gt: new Date() },
      },
      { $inc: { passwordResetOtpAttempts: 1 } },
      { returnDocument: "after" }
    ).select("+passwordResetOtpHash +passwordResetOtpAttempts");

    if (!claimed) {
      const locked = await User.exists({
        email,
        passwordResetOtpAttempts: { $gte: MAX_OTP_ATTEMPTS },
        passwordResetOtpExpiresAt: { $gt: new Date() },
      });
      return locked ? tooManyAttempts() : invalidCode();
    }

    const storedHash = claimed.passwordResetOtpHash;
    if (!storedHash || !/^[a-f\d]{64}$/i.test(storedHash)) return invalidCode();

    const matches = timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(hashEmailOtp(otp), "hex")
    );
    if (!matches) {
      return claimed.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS ? tooManyAttempts() : invalidCode();
    }

    // Right code: set the new password, but only if this exact code is still the current one.
    // passwordChangedAt makes every older login token stop working.
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne(
      { _id: claimed._id, passwordResetOtpHash: storedHash },
      {
        $set: { passwordHash, passwordChangedAt: new Date(), passwordResetOtpAttempts: 0 },
        $unset: RESET_FIELDS,
      }
    );
    if (!result.modifiedCount) return invalidCode();

    sendInBackground(passwordChangedNotice(claimed.email));

    return res.status(200).json({
      success: true,
      message: "Password updated. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/me/password   (logged in)
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+passwordHash");

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return res.status(400).json({
        success: false,
        message: "The new password must be different from the current one.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash, passwordChangedAt: new Date() },
        $unset: RESET_FIELDS, // a reset code requested earlier is no longer valid
      }
    );

    sendInBackground(passwordChangedNotice(user.email));

    // Every older token is now rejected. This fresh one keeps THIS device logged in.
    return res.status(200).json({
      success: true,
      message: "Password changed. You have been signed out of your other devices.",
      data: { token: signToken(user._id) },
    });
  } catch (error) {
    next(error);
  }
}
