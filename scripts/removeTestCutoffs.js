import "dotenv/config";
import mongoose from "mongoose";
import { Cutoff } from "../models/index.js";

await mongoose.connect(process.env.MONGODB_URI);
const res = await Cutoff.deleteMany({ sourceUrl: "PLACEHOLDER-TEST-DATA" });
console.log(`Deleted ${res.deletedCount} placeholder cutoffs`);
await mongoose.disconnect();