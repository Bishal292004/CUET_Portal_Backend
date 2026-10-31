import { University, Course, Programme, Update, Notification } from "../models/index.js";
import { logAudit } from "../utils/audit.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { notifySubscribers } from "../utils/notify.js";

const notFound = (res) => res.status(404).json({ success: false, message: "Update not found." });
const badRequest = (res, message) => res.status(400).json({ success: false, message });

// GET /api/admin/universities/:id/updates
export async function listUniversityUpdatesAdmin(req, res, next) {
  try {
    const university = await University.exists({ _id: req.params.id });
    if (!university) {
      return res.status(404).json({ success: false, message: "University not found." });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { university: req.params.id };

    const [updates, total] = await Promise.all([
      Update.find(filter)
        .populate("course", "name slug")
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Update.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { updates, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/universities/:id/updates
export async function createUpdate(req, res, next) {
  try {
    const university = await University.findById(req.params.id).select("name verified isArchived");
    if (!university || university.isArchived) {
      return res.status(404).json({ success: false, message: "University not found." });
    }
    if (!university.verified) {
      return badRequest(res, "Verify the university before publishing updates for it.");
    }

    const { courseId, ...fields } = req.body;

    if (courseId) {
      const course = await Course.exists({ _id: courseId, isActive: true });
      if (!course) return badRequest(res, "Course not found.");

      const offered = await Programme.exists({
        university: university._id,
        course: courseId,
        isArchived: false,
      });
      if (!offered) return badRequest(res, "This university does not offer that course.");
    }

    const update = await Update.create({
      ...fields,
      university: university._id,
      course: courseId,
      origin: "MANUAL",
      createdBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "Update",
      entityId: update._id,
      after: update.toObject(),
    });

    // The update is saved. If creating notifications fails, say so instead of hiding it:
    // an editor can retry with POST /api/admin/updates/:id/notify
    let notified = 0;
    let notificationsQueued = false;
    try {
      notified = await notifySubscribers(update);
      notificationsQueued = true;
    } catch (error) {
      console.error("Creating notifications failed:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: notificationsQueued
        ? "Update published."
        : "Update saved, but notifications could not be created. Use the retry route.",
      data: { update, notified, notificationsQueued },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/updates/:id  (fixes typos; does NOT re-notify)
export async function patchUpdate(req, res, next) {
  try {
    const update = await Update.findById(req.params.id);
    if (!update) return notFound(res);

    const before = update.toObject();
    update.set(req.body);
    await update.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Update",
      entityId: update._id,
      before,
      after: update.toObject(),
    });

    return res.status(200).json({ success: true, message: "Update saved.", data: { update } });
  } catch (error) {
    if (error.name === "ValidationError") return badRequest(res, "Invalid data provided.");
    next(error);
  }
}

// DELETE /api/admin/updates/:id  (for announcements published by mistake)
export async function deleteUpdate(req, res, next) {
  try {
    const update = await Update.findById(req.params.id);
    if (!update) return notFound(res);

    const before = update.toObject();

    await Notification.deleteMany({ update: update._id });
    await update.deleteOne();

    await logAudit({
      userId: req.user._id,
      action: "DELETE",
      entity: "Update",
      entityId: update._id,
      before,
    });

    return res.status(200).json({ success: true, message: "Update and its notifications deleted." });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/updates/:id/notify  (retry after a failed fan-out; safe to repeat)
export async function retryNotifications(req, res, next) {
  try {
    const update = await Update.findById(req.params.id);
    if (!update) return notFound(res);

    if (update.notificationsQueued) {
      return res.status(200).json({
        success: true,
        message: "Notifications for this update were already created.",
        data: { notified: 0 },
      });
    }

    const notified = await notifySubscribers(update);
    return res.status(200).json({
      success: true,
      message: "Notifications created.",
      data: { notified },
    });
  } catch (error) {
    next(error);
  }
}
