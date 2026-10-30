import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";

await mongoose.connect(process.env.MONGODB_URI);

// Accounts created BEFORE the OTP feature have no emailVerified field at all.
// Accounts created after it always have the field (false until verified), so this
// filter touches only the older ones.
const res = await User.updateMany(
  { emailVerified: { $exists: false } },
  { $set: { emailVerified: true } },
);

console.log(`Marked ${res.modifiedCount} older account(s) as verified.`);
await mongoose.disconnect();
