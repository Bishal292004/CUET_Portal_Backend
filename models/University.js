import mongoose from "mongoose";
import { ADMISSION_STATUS } from "./constants.js";

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    shortName: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    state: { type: String, required: true, trim: true, index: true },
    city: { type: String, trim: true },
    type: {
      type: String,
      enum: ["CENTRAL", "STATE", "DEEMED", "PRIVATE", "OTHER"],
    },

    websiteUrl: { type: String, trim: true },
    admissionUrl: { type: String, trim: true },

    admissionStatus: {
      type: String,
      enum: ADMISSION_STATUS,
      default: "NOT_STARTED",
      index: true,
    },
    statusUpdatedAt: Date,

    verified: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("University", universitySchema);
