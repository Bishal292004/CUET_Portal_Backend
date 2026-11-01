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

    // The email "outbox": a background job sends every QUEUED notification
    emailStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "QUEUED", "SENDING", "SENT", "FAILED"],
      default: "NOT_REQUIRED",
    },
    emailAttempts: { type: Number, default: 0 },
    emailNextAttemptAt: Date, // when a failed email may be tried again
    emailClaimedAt: Date, // when the job picked it up
    emailSentAt: Date,
    emailError: String,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index({ emailStatus: 1, createdAt: 1 }); // lets the email job find work quickly
notificationSchema.index({ emailSentAt: 1 });

// One notification per student per update. Makes retrying a failed send safe.
notificationSchema.index(
  { user: 1, update: 1 },
  { unique: true, partialFilterExpression: { update: { $exists: true } } }
);

export default mongoose.model("Notification", notificationSchema);