import mongoose from "mongoose";
import { CATEGORIES } from "./constants.js";

const cutoffSchema = new mongoose.Schema(
  {
    programme: { type: mongoose.Schema.Types.ObjectId, ref: "Programme", required: true },
    year: { type: Number, required: true },
    round: { type: Number, default: 1, min: 1 },
    category: { type: String, enum: CATEGORIES, required: true },

    closingScore: { type: Number, required: true, min: 0, max:300},
    sourceUrl: { type: String, trim: true },

    verified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

cutoffSchema.index(
  { programme: 1, year: 1, round: 1, category: 1 },
  { unique: true }
);

export default mongoose.model("Cutoff", cutoffSchema);