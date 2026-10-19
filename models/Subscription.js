import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: "University", required: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, university: 1 }, { unique: true });
subscriptionSchema.index({ university: 1 });

export default mongoose.model("Subscription", subscriptionSchema);