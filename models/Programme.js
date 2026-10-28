import mongoose from "mongoose";

const programmeSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },

    programmeName: { type: String, trim: true },
    durationYears: { type: Number, min: 1 },
    totalSeats: { type: Number, min: 0 },
    seatsAvailable: { type: Number, min: 0 },
    annualFee: { type: Number, min: 0 },
    eligibility: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    lastVerifiedAt: Date,

    verified: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

programmeSchema.index({ university: 1, course: 1 }, { unique: true });
programmeSchema.index({ course: 1, annualFee: 1 });

export default mongoose.model("Programme", programmeSchema);