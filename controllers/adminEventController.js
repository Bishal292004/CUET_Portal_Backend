import { University, Course, Programme, Event } from "../models/index.js";
import { EVENT_TYPES } from "../models/constants.js";
import { logAudit } from "../utils/audit.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";

const notFound = (res) => res.status(404).json({ success: false, message: "Event not found." });
const badRequest = (res, message) => res.status(400).json({ success: false, message });

// A course-specific date must be for a course this university really offers
async function courseProblem(universityId, courseId) {
  if (!(await Course.exists({ _id: courseId, isActive: true }))) return "Course not found.";
  const offered = await Programme.exists({ university: universityId, course: courseId, isArchived: false });
  return offered ? null : "This university does not offer that course.";
}

// GET /api/admin/universities/:id/events  (includes events not yet verified)
export async function listUniversityEventsAdmin(req, res, next) {
  try {
    if (!(await University.exists({ _id: req.params.id }))) {
      return res.status(404).json({ success: false, message: "University not found." });
    }

    const { page, limit, skip } = getPagination(req.query);
    const { type, verified } = req.query;

    const filter = { university: req.params.id };
    if (typeof type === "string" && EVENT_TYPES.includes(type)) filter.type = type;
    if (verified === "true" || verified === "false") filter.verified = verified === "true";

    const [events, total] = await Promise.all([
      Event.find(filter).populate("course", "name slug").sort({ startsAt: 1, _id: 1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { events, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/universities/:id/events
export async function createEvent(req, res, next) {
  try {
    const university = await University.exists({ _id: req.params.id, isArchived: false });
    if (!university) {
      return res.status(404).json({ success: false, message: "University not found." });
    }

    const { courseId, ...fields } = req.body;

    if (courseId) {
      const problem = await courseProblem(req.params.id, courseId);
      if (problem) return badRequest(res, problem);
    }

    // Stops the same date being entered twice
    const duplicate = await Event.exists({
      university: req.params.id,
      course: courseId ?? null, // null also matches "no course"
      type: fields.type,
      title: fields.title,
      startsAt: fields.startsAt,
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "This event already exists." });
    }

    const event = await Event.create({
      ...fields,
      university: req.params.id,
      course: courseId,
      createdBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "Event",
      entityId: event._id,
      after: event.toObject(),
    });

    return res.status(201).json({ success: true, message: "Event created.", data: { event } });
  } catch (error) {
    if (error.name === "ValidationError") return badRequest(res, "Invalid data provided.");
    next(error);
  }
}

// PATCH /api/admin/events/:id
export async function updateEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return notFound(res);

    const { courseId, ...fields } = req.body;

    if (courseId) {
      const problem = await courseProblem(event.university, courseId);
      if (problem) return badRequest(res, problem);
    }

    const before = event.toObject();

    event.set(fields);
    if (courseId === null) event.course = undefined;
    else if (courseId) event.course = courseId;

    if (event.endsAt && event.endsAt < event.startsAt) {
      return badRequest(res, "endsAt cannot be before startsAt.");
    }

    await event.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Event",
      entityId: event._id,
      before,
      after: event.toObject(),
    });

    return res.status(200).json({ success: true, message: "Event updated.", data: { event } });
  } catch (error) {
    if (error.name === "ValidationError") return badRequest(res, "Invalid data provided.");
    next(error);
  }
}

// DELETE /api/admin/events/:id  (the audit log keeps a copy of what was deleted)
export async function deleteEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return notFound(res);

    const before = event.toObject();
    await event.deleteOne();

    await logAudit({
      userId: req.user._id,
      action: "DELETE",
      entity: "Event",
      entityId: event._id,
      before,
    });

    return res.status(200).json({ success: true, message: "Event deleted." });
  } catch (error) {
    next(error);
  }
}
