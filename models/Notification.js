import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University" },
    update: { type: mongoose.Schema.Types.ObjectId, ref: "Update" },

    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    link: { type: String, trim: true },

    readAt: Date,

    emailStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "QUEUED", "SENT", "FAILED"],
      default: "NOT_REQUIRED",
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });

export default mongoose.model("Notification", notificationSchema);