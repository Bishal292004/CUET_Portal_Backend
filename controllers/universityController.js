import { University, Event } from "../models/index.js";
import { ADMISSION_STATUS, EVENT_TYPES } from "../models/constants.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const PUBLIC = { verified: true, isArchived: false };
const HIDE = "-createdBy -updatedBy -verified -isArchived -__v";

const notFound = (res) =>
  res.status(404).json({ success: false, message: "University not found." });

export async function listUniversities(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { q, state, status } = req.query;

    const filter = { ...PUBLIC };
    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }
    if (typeof state === "string" && state.trim()) filter.state = state.trim();
    if (typeof status === "string" && ADMISSION_STATUS.includes(status)) {
      filter.admissionStatus = status;
    }

    const [universities, total] = await Promise.all([
      University.find(filter).select(HIDE).sort({ name: 1 }).skip(skip).limit(limit),
      University.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { universities, pagination: paginationMeta(page, limit, total) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUniversity(req, res, next) {
  try {
    const university = await University.findOne({ _id: req.params.id, ...PUBLIC }).select(HIDE);
    if (!university) return notFound(res);
    return res.status(200).json({ success: true, data: { university } });
  } catch (error) {
    next(error);
  }
}

export async function listUniversityEvents(req, res, next) {
  try {
    const university = await University.findOne({ _id: req.params.id, ...PUBLIC }).select("_id");
    if (!university) return notFound(res);

    const { type, from, to } = req.query;
    const filter = { university: university._id, verified: true };

    if (typeof type === "string" && EVENT_TYPES.includes(type)) filter.type = type;

    const range = {};
    for (const [key, op] of [[from, "$gte"], [to, "$lte"]]) {
      if (key === undefined) continue;
      const date = typeof key === "string" ? new Date(key) : new Date(NaN);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "from and to must be valid dates, e.g. 2026-07-01.",
        });
      }
      range[op] = date;
    }
    if (Object.keys(range).length) filter.startsAt = range;

    const events = await Event.find(filter)
      .select("-createdBy -verified -__v")
      .populate("course", "name slug")
      .sort({ startsAt: 1 })
      .limit(200); // one university never needs more; stops runaway responses

    return res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    next(error);
  }
}