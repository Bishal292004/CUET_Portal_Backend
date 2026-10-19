import mongoose from "mongoose";
import { EVENT_TYPES } from "./constants.js";

const eventSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    type: { type: String, enum: EVENT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    startsAt: { type: Date, required: true },
    endsAt: Date,
    sourceUrl: { type: String, trim: true },

    verified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventSchema.index({ university: 1, startsAt: 1 });

export default mongoose.model("Event", eventSchema);