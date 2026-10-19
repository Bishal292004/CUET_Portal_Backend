import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";
import { ROLES } from "../models/constants.js";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3] || "admin";

if (!email || !ROLES.includes(role)) {
  console.log("Usage: npm run set-role -- <email> [student|editor|admin]");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
console.log(user ? `${user.email} is now ${user.role}` : "No user found with that email");
await mongoose.disconnect();