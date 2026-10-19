import mongoose from "mongoose";
import { ROLES, CATEGORIES } from "./constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "student" },

    category: { type: String, enum: CATEGORIES },
    preferredStates: [{ type: String, trim: true }],
    interestedCourses: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    ],

    cuetYear: { type: Number },
    cuetScores: [
        {
            _id: false,
            course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required:true },
            score: {type: Number, required: true, min: 0, max: 300},
            isExpected: { type: Boolean, default: false },
        }
    ],

    
    emailNotifications: { type: Boolean, default: true },

    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
