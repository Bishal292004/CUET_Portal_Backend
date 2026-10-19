import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true },
    url: { type: String, required: true, trim: true },
    cssSelector: { type: String, trim: true },
    needsBrowser: { type: Boolean, default: false },

    intervalHours: { type: Number, default: 6, min: 1 },
    isEnabled: { type: Boolean, default: true },

    lastCheckedAt: Date,
    lastContentHash: String,
    lastStatus: { type: String, enum: ["OK", "ERROR"], default: "OK" },
    lastError: String,
  },
  { timestamps: true }
);

monitorSchema.index({ isEnabled: 1, lastCheckedAt: 1 });

export default mongoose.model("Monitor", monitorSchema);