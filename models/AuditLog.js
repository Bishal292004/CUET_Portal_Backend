import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // the newest-first list
auditLogSchema.index({ user: 1, createdAt: -1 }); // what did this person change?

export default mongoose.model("AuditLog", auditLogSchema);