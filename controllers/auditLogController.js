import { AuditLog } from "../models/index.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { isObjectId } from "../utils/isObjectId.js";

const ACTIONS = ["CREATE", "UPDATE", "DELETE"];
const badRequest = (res, message) => res.status(400).json({ success: false, message });

// GET /api/admin/audit-logs
export async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { entity, entityId, userId, action, from, to } = req.query;

    const filter = {};

    if (entity !== undefined) {
      if (typeof entity !== "string" || !/^[A-Za-z]{1,40}$/.test(entity)) return badRequest(res, "Invalid entity.");
      filter.entity = entity;
    }
    if (entityId !== undefined) {
      if (!isObjectId(entityId)) return badRequest(res, "Invalid entityId.");
      filter.entityId = entityId;
    }
    if (userId !== undefined) {
      if (!isObjectId(userId)) return badRequest(res, "Invalid userId.");
      filter.user = userId;
    }
    if (action !== undefined) {
      if (typeof action !== "string" || !ACTIONS.includes(action)) return badRequest(res, "Invalid action.");
      filter.action = action;
    }

    const range = {};
    for (const [value, operator] of [[from, "$gte"], [to, "$lte"]]) {
      if (value === undefined) continue;
      const date = typeof value === "string" ? new Date(value) : new Date(NaN);
      if (Number.isNaN(date.getTime())) return badRequest(res, "from and to must be valid dates, e.g. 2026-11-01.");
      range[operator] = date;
    }
    if (Object.keys(range).length) filter.createdAt = range;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .select("-__v")
        .populate("user", "name email role")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { logs, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}
