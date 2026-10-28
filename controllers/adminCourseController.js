import { Course } from "../models/index.js";
import { slugify } from "../utils/slugify.js";
import { logAudit } from "../utils/audit.js";
import { getPagination } from "../utils/pagination.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { handleDbError } from "../utils/handleDbError.js";

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Course not found." });

const DUPLICATE_MSG = "A course with this name already exists.";

export async function listCourses(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { q, category, archived } = req.query;

    // Courses use isActive, so "archived" means isActive: false
    const filter = { isActive: archived !== "true" };

    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }
    if (typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }

    const [courses, total] = await Promise.all([
      Course.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Course.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFound(res);
    return res.status(200).json({ success: true, data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const course = await Course.create({
      ...req.body,
      slug: slugify(req.body.name),
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "Course",
      entityId: course._id,
      after: course.toObject(),
    });

    return res.status(201).json({
      success: true,
      message: "Course created.",
      data: { course },
    });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function updateCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFound(res);

    const before = course.toObject();

    course.set(req.body);
    await course.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Course",
      entityId: course._id,
      before,
      after: course.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: "Course updated.",
      data: { course },
    });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function archiveCourse(req, res, next) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return notFound(res);

    const before = course.toObject();

    course.isActive = false;
    await course.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Course",
      entityId: course._id,
      before,
      after: course.toObject(),
    });

    return res.status(200).json({ success: true, message: "Course archived." });
  } catch (error) {
    next(error);
  }
}