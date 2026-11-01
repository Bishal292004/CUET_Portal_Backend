import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { createProgrammeSchema, updateProgrammeSchema } from "../validators/programmeValidators.js";
import { createCutoffSchema } from "../validators/cutoffValidators.js";
import {
  listProgrammesAdmin,
  getProgrammeAdmin,
  createProgramme,
  updateProgramme,
  archiveProgramme,
  verifyProgramme,
} from "../controllers/adminProgrammeController.js";
import { listCutoffsAdmin, createCutoff } from "../controllers/adminCutoffController.js";

const router = Router();
router.param("id", checkId);

router.get("/", listProgrammesAdmin);
router.post("/", validate(createProgrammeSchema), createProgramme);
router.get("/:id", getProgrammeAdmin);
router.patch("/:id", validate(updateProgrammeSchema), updateProgramme);
router.delete("/:id", archiveProgramme);
router.post("/:id/verify", verifyProgramme);
router.get("/:id/cutoffs", listCutoffsAdmin);
router.post("/:id/cutoffs", validate(createCutoffSchema), createCutoff);

export default router;
