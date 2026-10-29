import { Course } from "../models/index.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export async function listCourses(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { q, category } = req.query;

    const filter = { isActive: true };
    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }
    if (typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select("name slug category cuetPaperCode")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { courses, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}