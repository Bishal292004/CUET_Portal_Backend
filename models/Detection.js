import mongoose from "mongoose";

const detectionSchema = new mongoose.Schema(
  {
    monitor: { type: mongoose.Schema.Types.ObjectId, ref: "Monitor", required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true },

    previousText: String,
    newText: String,

    status: { type: String, enum: ["PENDING", "APPROVED", "DISMISSED"], default: "PENDING", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    note: String,
  },
  { timestamps: true }
);

export default mongoose.model("Detection", detectionSchema);