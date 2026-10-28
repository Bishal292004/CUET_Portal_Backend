import { AuditLog } from "../models/index.js";

export async function logAudit({ userId, action, entity, entityId, before, after }) {
  try {
    await AuditLog.create({ user: userId, action, entity, entityId, before, after });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}