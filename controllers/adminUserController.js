import { User } from "../models/index.js";
import { ROLES } from "../models/constants.js";
import { logAudit } from "../utils/audit.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { escapeRegex } from "../utils/escapeRegex.js";

// What an admin may see about a user. Never passwords or codes.
const LIST_FIELDS = "name email role isActive emailVerified category lastLoginAt createdAt";

const badRequest = (res, message) => res.status(400).json({ success: false, message });

// Only role, status and email go into the audit log
const snapshot = (u) => ({ email: u.email, role: u.role, isActive: u.isActive });

// GET /api/admin/users
export async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { role, q, active, verified } = req.query;

    const filter = {};
    if (role !== undefined) {
      if (typeof role !== "string" || !ROLES.includes(role)) return badRequest(res, "Invalid role.");
      filter.role = role;
    }
    if (active === "true" || active === "false") filter.isActive = active === "true";
    if (verified === "true" || verified === "false") filter.emailVerified = verified === "true";
    if (typeof q === "string" && q.trim()) {
      const pattern = { $regex: escapeRegex(q.trim()), $options: "i" };
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const [users, total, roleCounts] = await Promise.all([
      User.find(filter).select(LIST_FIELDS).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
      Promise.all(ROLES.map((r) => User.countDocuments({ role: r }))),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        totals: Object.fromEntries(ROLES.map((r, i) => [r, roleCounts[i]])),
        pagination: paginationMeta(page, limit, total),
      },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/users/:id   { role?, isActive? }
export async function updateUser(req, res, next) {
  try {
    const target = await User.findById(req.params.id).select("name email role isActive");
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { role, isActive } = req.body;

    // An admin can never lock themselves out, which also guarantees that at least one
    // active admin always exists: whoever is making this change.
    const isSelf = String(target._id) === String(req.user._id);
    if (isSelf && ((role !== undefined && role !== target.role) || isActive === false)) {
      return badRequest(res, "You cannot change your own role or deactivate your own account. Ask another admin.");
    }

    const changes = {};
    if (role !== undefined && role !== target.role) changes.role = role;
    if (isActive !== undefined && isActive !== target.isActive) changes.isActive = isActive;

    if (!Object.keys(changes).length) {
      return res.status(200).json({
        success: true,
        message: "Nothing to change.",
        data: { user: target },
      });
    }

    const before = snapshot(target);

    const updated = await User.findByIdAndUpdate(
      target._id,
      { $set: changes },
      { returnDocument: "after", runValidators: true }
    ).select(LIST_FIELDS);

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "User",
      entityId: target._id,
      before,
      after: snapshot(updated),
    });

    return res.status(200).json({ success: true, message: "User updated.", data: { user: updated } });
  } catch (error) {
    next(error);
  }
}
