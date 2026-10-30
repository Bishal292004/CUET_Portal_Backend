import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

//email otp
import { sendEmail } from "../utils/email.js";
import { createEmailOtp } from "../utils/emailOtp.js";
import { timingSafeEqual } from "node:crypto";
import { hashEmailOtp } from "../utils/emailOtp.js";

// Used when the email doesn't exist, so the response takes the same time either way
const DUMMY_HASH = await bcrypt.hash("YB61ZnAO#123", 10);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//function for new user registration
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // 1. Types: reject anything that isn't plain text (blocks NoSQL injection)
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    // 2. Clean the input
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 3. Validate
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 100 characters.",
      });
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // 4. Friendly duplicate check
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }

    // 5. Hash and save
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
    });

    //email otp verification
    const { otp, otpHash, expiresAt } = createEmailOtp();

    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationOtpExpiresAt = expiresAt;
    user.emailVerificationOtpLastSentAt = new Date();
    user.emailVerificationOtpAttempts = 0;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Verify your CUET PG Portal email",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    });

    // 6. Respond with safe fields only (never send the whole document)
    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    // Safety net for the race condition in point 10
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided.",
      });
    }
    next(error); // anything else goes to the central error handler
  }
}

//function for user login

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    //clear the mail
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail }).select(
      "+passwordHash",
    );

    //run bcrypt even for unknown email, to keep the timing same
    const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCheck);

    //if user donot exist or wrong password
    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    //check after the password, so stranger can't probe which accounts exist
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    }

    //email verification check
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    return res.status(200).json({
      success: true,
      message: "Login successfull.",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid email and six-digit code are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail }).select(
      "+emailVerificationOtpHash " +
        "+emailVerificationOtpExpiresAt " +
        "+emailVerificationOtpAttempts",
    );

    const invalidCode = () =>
      res.status(400).json({
        success: false,
        message: "Verification code is invalid or expired.",
      });

    if (!user || user.emailVerified) {
      return invalidCode();
    }

    if (user.emailVerificationOtpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new code.",
      });
    }

    const storedHash = user.emailVerificationOtpHash;
    const expiresAt = user.emailVerificationOtpExpiresAt;

    if (
      !storedHash ||
      !/^[a-f\d]{64}$/i.test(storedHash) ||
      !expiresAt ||
      expiresAt.getTime() <= Date.now()
    ) {
      return invalidCode();
    }

    const submittedHash = hashEmailOtp(otp);
    const matches = timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(submittedHash, "hex"),
    );

    if (!matches) {
      user.emailVerificationOtpAttempts += 1;
      await user.save();

      if (user.emailVerificationOtpAttempts >= 5) {
        return res.status(429).json({
          success: false,
          message: "Too many incorrect attempts. Request a new code.",
        });
      }

      return invalidCode();
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpiresAt = undefined;
    user.emailVerificationOtpLastSentAt = undefined;
    user.emailVerificationOtpAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
}

//resend otp for email verification
export async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - 60 * 1000);

    const { otp, otpHash, expiresAt } = createEmailOtp();

    // Claim the resend only if the account is unverified and its
    // previous code was sent at least 60 seconds ago.
    const user = await User.findOneAndUpdate(
      {
        email: cleanEmail,
        emailVerified: false,
        $or: [
          { emailVerificationOtpLastSentAt: { $exists: false } },
          { emailVerificationOtpLastSentAt: { $lte: cooldownCutoff } },
        ],
      },
      {
        $set: {
          emailVerificationOtpHash: otpHash,
          emailVerificationOtpExpiresAt: expiresAt,
          emailVerificationOtpLastSentAt: now,
          emailVerificationOtpAttempts: 0,
        },
      },
      { new: true, runValidators: true },
    );

    const genericResponse = {
      success: true,
      message:
        "If the account can receive a verification code, one has been sent.",
    };

    // Same response if the account is absent, already verified,
    // or still within the resend cooldown.
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Your CUET PG Portal verification code",
        text: `Your new verification code is ${otp}. It expires in 10 minutes.`,
      });
    } catch (error) {
      // Remove this code if delivery failed, allowing the student to retry.
      await User.updateOne(
        { _id: user._id, emailVerificationOtpHash: otpHash },
        {
          $unset: {
            emailVerificationOtpHash: 1,
            emailVerificationOtpExpiresAt: 1,
            emailVerificationOtpLastSentAt: 1,
          },
          $set: { emailVerificationOtpAttempts: 0 },
        },
      );

      throw error;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
}
