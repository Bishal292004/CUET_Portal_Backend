import { University, Course, Programme, Cutoff } from "../models/index.js";
import { ADMISSION_STATUS, CATEGORIES } from "../models/constants.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { isObjectId } from "../utils/isObjectId.js";

const SORTS = {
  fee: { annualFee: 1 },
  "-fee": { annualFee: -1 },
  seats: { totalSeats: 1 },
  "-seats": { totalSeats: -1 },
};

const badRequest = (res, message) => res.status(400).json({ success: false, message });

export async function listProgrammes(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { courseId, universityId, state, status, maxFee, minSeats, sort } = req.query;

    if (courseId !== undefined && !isObjectId(courseId)) return badRequest(res, "Invalid courseId.");
    if (universityId !== undefined && !isObjectId(universityId)) return badRequest(res, "Invalid universityId.");

    // Step 1: which universities and courses are visible to students (and match the filters)?
    const uniFilter = { verified: true, isArchived: false };
    if (universityId) uniFilter._id = universityId;
    if (typeof state === "string" && state.trim()) uniFilter.state = state.trim();
    if (typeof status === "string" && ADMISSION_STATUS.includes(status)) {
      uniFilter.admissionStatus = status;
    }

    const courseFilter = { isActive: true };
    if (courseId) courseFilter._id = courseId;

    const [uniIds, courseIds] = await Promise.all([
      University.distinct("_id", uniFilter),
      Course.distinct("_id", courseFilter),
    ]);

    // Step 2: programmes that connect those universities and courses
    const filter = {
      verified: true,
      isArchived: false,
      university: { $in: uniIds },
      course: { $in: courseIds },
    };

    if (maxFee !== undefined) {
      const fee = Number(maxFee);
      if (!Number.isFinite(fee) || fee < 0) return badRequest(res, "maxFee must be a positive number.");
      filter.annualFee = { $lte: fee };
    }
    if (minSeats !== undefined) {
      const seats = Number(minSeats);
      if (!Number.isFinite(seats) || seats < 0) return badRequest(res, "minSeats must be a positive number.");
      filter.totalSeats = { $gte: seats };
    }

    const order = typeof sort === "string" && Object.hasOwn(SORTS, sort) ? SORTS[sort] : {};

    const [programmes, total] = await Promise.all([
      Programme.find(filter)
        .select("-updatedBy -verified -isArchived -__v")
        .populate("university", "name shortName slug state city admissionStatus admissionUrl lastVerifiedAt")
        .populate("course", "name slug category")
        .sort({ ...order, _id: 1 })
        .skip(skip)
        .limit(limit),
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

// A programme is public only if it, its university and its course are all public
async function findPublicProgramme(id) {
  const programme = await Programme.findOne({ _id: id, verified: true, isArchived: false })
    .populate("university", "verified isArchived")
    .populate("course", "isActive");

  if (!programme || !programme.university || !programme.course) return null;
  if (!programme.university.verified || programme.university.isArchived) return null;
  if (!programme.course.isActive) return null;
  return programme;
}

export async function listProgrammeCutoffs(req, res, next) {
  try {
    const programme = await findPublicProgramme(req.params.id);
    if (!programme) {
      return res.status(404).json({ success: false, message: "Programme not found." });
    }

    const { category, year } = req.query;
    const filter = { programme: programme._id, verified: true };
    if (typeof category === "string" && CATEGORIES.includes(category)) filter.category = category;
    if (typeof year === "string" && /^\d{4}$/.test(year)) filter.year = Number(year);

    const cutoffs = await Cutoff.find(filter)
      .select("-createdBy -verified -programme -__v")
      .sort({ year: -1, round: 1, category: 1 })
      .lean();

    // Hide the test-data marker: only real web links are sent out
    const data = cutoffs.map((c) => ({
      ...c,
      sourceUrl: /^https?:\/\//i.test(c.sourceUrl ?? "") ? c.sourceUrl : undefined,
    }));

    return res.status(200).json({ success: true, data: { cutoffs: data } });
  } catch (error) {
    next(error);
  }
}