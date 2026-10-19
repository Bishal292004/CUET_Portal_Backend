import mongoose from "mongoose";
import { UPDATE_TYPES } from "./constants.js";

const updateSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    type: { type: String, enum: UPDATE_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },

    publishedAt: { type: Date, default: Date.now },
    notificationsQueued: { type: Boolean, default: false },

    origin: { type: String, enum: ["MANUAL", "SCRAPER"], default: "MANUAL" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

updateSchema.index({ university: 1, publishedAt: -1 });

export default mongoose.model("Update", updateSchema);