import { Programme, Cutoff } from "../models/index.js";
import { logAudit } from "../utils/audit.js";
import { handleDbError } from "../utils/handleDbError.js";

const notFound = (res) => res.status(404).json({ success: false, message: "Cutoff not found." });

const DUPLICATE_MSG =
  "A cutoff for this programme, year, round and category already exists. Edit it instead.";

// GET /api/admin/programmes/:id/cutoffs  (includes cutoffs not yet verified)
export async function listCutoffsAdmin(req, res, next) {
  try {
    if (!(await Programme.exists({ _id: req.params.id }))) {
      return res.status(404).json({ success: false, message: "Programme not found." });
    }

    const cutoffs = await Cutoff.find({ programme: req.params.id }).sort({
      year: -1,
      round: 1,
      category: 1,
    });

    return res.status(200).json({ success: true, data: { cutoffs } });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/programmes/:id/cutoffs
export async function createCutoff(req, res, next) {
  try {
    if (!(await Programme.exists({ _id: req.params.id, isArchived: false }))) {
      return res.status(404).json({ success: false, message: "Programme not found." });
    }

    const cutoff = await Cutoff.create({
      ...req.body,
      programme: req.params.id,
      createdBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      action: "CREATE",
      entity: "Cutoff",
      entityId: cutoff._id,
      after: cutoff.toObject(),
    });

    return res.status(201).json({ success: true, message: "Cutoff created.", data: { cutoff } });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

// PATCH /api/admin/cutoffs/:id
export async function updateCutoff(req, res, next) {
  try {
    const cutoff = await Cutoff.findById(req.params.id);
    if (!cutoff) return notFound(res);

    const before = cutoff.toObject();
    cutoff.set(req.body);
    await cutoff.save();

    await logAudit({
      userId: req.user._id,
      action: "UPDATE",
      entity: "Cutoff",
      entityId: cutoff._id,
      before,
      after: cutoff.toObject(),
    });

    return res.status(200).json({ success: true, message: "Cutoff updated.", data: { cutoff } });
  } catch (error) {
    if (!handleDbError(error, res, DUPLICATE_MSG)) next(error);
  }
}

// DELETE /api/admin/cutoffs/:id
export async function deleteCutoff(req, res, next) {
  try {
    const cutoff = await Cutoff.findById(req.params.id);
    if (!cutoff) return notFound(res);

    const before = cutoff.toObject();
    await cutoff.deleteOne();

    await logAudit({
      userId: req.user._id,
      action: "DELETE",
      entity: "Cutoff",
      entityId: cutoff._id,
      before,
    });

    return res.status(200).json({ success: true, message: "Cutoff deleted." });
  } catch (error) {
    next(error);
  }
}
