import "dotenv/config";
import mongoose from "mongoose";
import { Course, University, Programme } from "../models/index.js";

await mongoose.connect(process.env.MONGODB_URI);

const course = await Course.create({
  name: "M.Sc. Mathematics",
  slug: "msc-mathematics",
  category: "Science",
});

const university = await University.create({
  name: "Test University",
  slug: "test-university",
  state: "Puducherry",
  admissionStatus: "OPEN",
  verified: true,
});

await Programme.create({
  university: university._id,
  course: course._id,
  totalSeats: 30,
  annualFee: 20000,
  verified: true,
});

console.log("Seeded");
await mongoose.disconnect();