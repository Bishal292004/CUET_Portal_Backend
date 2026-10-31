import { Notification } from "../models/index.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

export async function listNotifications(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter = { user: req.user._id };
    if (req.query.unread === "true") filter.readAt = null;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .select("-user -emailStatus -__v")
        .populate("university", "name shortName slug")
        .populate("update", "type sourceUrl publishedAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ]);

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}

// A light request for the bell icon badge
export async function unreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, readAt: null });
    return res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    // Only touches unread notifications that belong to THIS student
    const result = await Notification.updateOne(
      { _id: req.params.id, user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    if (!result.matchedCount) {
      // Either it was already read (fine) or it is not theirs / does not exist (404)
      const exists = await Notification.exists({ _id: req.params.id, user: req.user._id });
      if (!exists) {
        return res.status(404).json({ success: false, message: "Notification not found." });
      }
    }

    return res.status(200).json({ success: true, message: "Marked as read." });
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      data: { updated: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
}
