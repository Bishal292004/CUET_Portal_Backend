import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import {
  createUniversitySchema,
  updateUniversitySchema,
  statusSchema,
} from "../validators/universityValidators.js";
import { createUpdateSchema } from "../validators/updateValidators.js";
import { createEventSchema } from "../validators/eventValidators.js";
import {
  listUniversityEventsAdmin,
  createEvent,
} from "../controllers/adminEventController.js";
import {
  listUniversityUpdatesAdmin,
  createUpdate,
} from "../controllers/adminUpdateController.js";
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
router.get("/:id/updates", listUniversityUpdatesAdmin);
router.post("/:id/updates", validate(createUpdateSchema), createUpdate);
router.get("/:id/events", listUniversityEventsAdmin);
router.post("/:id/events", validate(createEventSchema), createEvent);

export default router;