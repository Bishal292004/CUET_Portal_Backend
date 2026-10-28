import { University } from "../models/index.js";
import { ADMISSION_STATUS } from "../models/constants.js";
import { slugify } from "../utils/slugify.js";
import { logAudit } from "../utils/audit.js";
import { getPagination } from "../utils/pagination.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { handleDbError } from "../utils/handleDbError.js";

const notFound = (res) =>
  res.status(404).json({ success: false, message: "University not found." });

const DUPLICATE_MSG = "A university with this name already exists.";

export async function listUniversities(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { q, state, status, verified, archived } = req.query;

    const filter = { isArchived: archived === "true" };

    // typeof checks block ?state[$ne]=x style injection (those arrive as objects)
    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }
    if (typeof state === "string" && state.trim()) filter.state = state.trim();
    if (typeof status === "string" && ADMISSION_STATUS.includes(status)) {
      filter.admissionStatus = status;
    }
    if (verified === "true" || verified === "false") {
      filter.verified = verified === "true";
    }

    const [universities, total] = await Promise.all([
      University.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      University.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        universities,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUniversity(req, res, next) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return notFound(res);
    return res.status(200).json({ success: true, data: { university } });
  } catch (error) {
    next(error);
  }
}

export async function createUniversity(req, res, next) {
  try {
    const university = await University.create({
      ...req.body, // safe: validate() already stripped it down to allowed fields
      slug: slugify(req.body.name),
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "University",
      entityId: university._id,
      after: university.toObject(),
    });

    return res.status(201).json({
      success: true,
      message: "University created.",
      data: { university },
    });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function updateUniversity(req, res, next) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return notFound(res);

    const before = university.toObject();

    university.set(req.body); // slug is untouched, so existing links never break
    university.updatedBy = req.user._id;
    await university.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "University",
      entityId: university._id,
      before,
      after: university.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: "University updated.",
      data: { university },
    });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return notFound(res);

    if (university.admissionStatus === req.body.status) {
      return res.status(200).json({
        success: true,
        message: "Status is already set to this value.",
        data: { university },
      });
    }

    const before = university.toObject();

    university.admissionStatus = req.body.status;
    university.statusUpdatedAt = new Date();
    university.lastVerifiedAt = new Date();
    university.updatedBy = req.user._id;
    await university.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "University",
      entityId: university._id,
      before,
      after: university.toObject(),
    });

    // Later: notify subscribed students here

    return res.status(200).json({
      success: true,
      message: "Admission status updated.",
      data: { university },
    });
  } catch (error) {
    next(error);
  }
}

export async function archiveUniversity(req, res, next) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return notFound(res);

    const before = university.toObject();

    university.isArchived = true;
    university.updatedBy = req.user._id;
    await university.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "University",
      entityId: university._id,
      before,
      after: university.toObject(),
    });

    return res.status(200).json({ success: true, message: "University archived." });
  } catch (error) {
    next(error);
  }
}



export async function verifyUniversity(req, res, next) {
  try {
    const university = await University.findById(req.params.id);
    if (!university) return notFound(res);

    const before = university.toObject();

    university.verified = true;
    university.lastVerifiedAt = new Date();
    university.updatedBy = req.user._id;
    await university.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "University",
      entityId: university._id,
      before,
      after: university.toObject(),
    });

    return res.status(200).json({
      success: true,
      message: "University marked as verified.",
      data: { university },
    });
  } catch (error) {
    next(error);
  }
}