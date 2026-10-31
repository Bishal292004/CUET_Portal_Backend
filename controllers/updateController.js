import { University, Update } from "../models/index.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

// Public: the announcements of one university, newest first
export async function listPublicUpdates(req, res, next) {
  try {
    const university = await University.findOne({
      _id: req.params.id,
      verified: true,
      isArchived: false,
    }).select("_id");

    if (!university) {
      return res.status(404).json({ success: false, message: "University not found." });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { university: university._id };

    const [updates, total] = await Promise.all([
      Update.find(filter)
        .select("-createdBy -notificationsQueued -origin -__v")
        .populate("course", "name slug")
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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
