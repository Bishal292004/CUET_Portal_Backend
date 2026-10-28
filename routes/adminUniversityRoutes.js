import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import {
  createUniversitySchema,
  updateUniversitySchema,
  statusSchema,
} from "../validators/universityValidators.js";
import {
  listUniversities,
  getUniversity,
  createUniversity,
  updateUniversity,
  updateStatus,
  archiveUniversity,
  verifyUniversity,
} from "../controllers/adminUniversityController.js";

const router = Router();

router.param("id", checkId); // runs automatically on every route containing :id

router.get("/", listUniversities);
router.post("/", validate(createUniversitySchema), createUniversity);
router.get("/:id", getUniversity);
router.patch("/:id", validate(updateUniversitySchema), updateUniversity);
router.patch("/:id/status", validate(statusSchema), updateStatus);
router.delete("/:id", archiveUniversity);
router.post("/:id/verify", verifyUniversity);

export default router;