import { University, Course, Programme } from "../models/index.js";
import { logAudit } from "../utils/audit.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { isObjectId } from "../utils/isObjectId.js";
import { handleDbError } from "../utils/handleDbError.js";

const notFound = (res) => res.status(404).json({ success: false, message: "Programme not found." });
const badRequest = (res, message) => res.status(400).json({ success: false, message });

const DUPLICATE_MSG =
  "This university already has a programme for that course (it may be archived: restore it with isArchived false).";

const populateBoth = (query) =>
  query.populate("university", "name shortName slug").populate("course", "name slug");

export async function listProgrammesAdmin(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { universityId, courseId, verified, archived } = req.query;

    if (universityId !== undefined && !isObjectId(universityId)) return badRequest(res, "Invalid universityId.");
    if (courseId !== undefined && !isObjectId(courseId)) return badRequest(res, "Invalid courseId.");

    const filter = { isArchived: archived === "true" };
    if (universityId) filter.university = universityId;
    if (courseId) filter.course = courseId;
    if (verified === "true" || verified === "false") filter.verified = verified === "true";

    const [programmes, total] = await Promise.all([
      populateBoth(Programme.find(filter).sort({ updatedAt: -1, _id: 1 }).skip(skip).limit(limit)),
      Programme.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { programmes, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProgrammeAdmin(req, res, next) {
  try {
    const programme = await populateBoth(Programme.findById(req.params.id));
    if (!programme) return notFound(res);
    return res.status(200).json({ success: true, data: { programme } });
  } catch (error) {
    next(error);
  }
}

export async function createProgramme(req, res, next) {
  try {
    const { universityId, courseId, ...fields } = req.body;

    if (!(await University.exists({ _id: universityId, isArchived: false }))) {
      return res.status(404).json({ success: false, message: "University not found." });
    }
    if (!(await Course.exists({ _id: courseId, isActive: true }))) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const programme = await Programme.create({
      ...fields,
      university: universityId,
      course: courseId,
      updatedBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "Programme",
      entityId: programme._id,
      after: programme.toObject(),
    });

    return res.status(201).json({ success: true, message: "Programme created.", data: { programme } });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function updateProgramme(req, res, next) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return notFound(res);

    const before = programme.toObject();

    programme.set(req.body);
    programme.updatedBy = req.user._id;

    // Checked after merging, so changing only one of the two numbers is also caught
    if (
      programme.seatsAvailable !== undefined &&
      programme.totalSeats !== undefined &&
      programme.seatsAvailable > programme.totalSeats
    ) {
      return badRequest(res, "seatsAvailable cannot be more than totalSeats.");
    }

    await programme.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Programme",
      entityId: programme._id,
      before,
      after: programme.toObject(),
    });

    return res.status(200).json({ success: true, message: "Programme updated.", data: { programme } });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function archiveProgramme(req, res, next) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return notFound(res);

    const before = programme.toObject();
    programme.isArchived = true;
    programme.updatedBy = req.user._id;
    await programme.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Programme",
      entityId: programme._id,
      before,
      after: programme.toObject(),
    });

    return res.status(200).json({ success: true, message: "Programme archived." });
  } catch (error) {
    next(error);
  }
}

// "I just checked this against the official source"
export async function verifyProgramme(req, res, next) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return notFound(res);

    const before = programme.toObject();
    programme.verified = true;
    programme.lastVerifiedAt = new Date();
    programme.updatedBy = req.user._id;
    await programme.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Programme",
      entityId: programme._id,
      before,
      after: programme.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: "Programme marked as verified.",
      data: { programme },
    });
  } catch (error) {
    next(error);
  }
}
