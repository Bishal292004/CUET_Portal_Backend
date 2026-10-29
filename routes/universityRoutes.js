import { Router } from "express";
import { checkId } from "../middleware/checkId.js";
import {
  listUniversities,
  getUniversity,
  listUniversityEvents,
} from "../controllers/universityController.js";

const router = Router();
router.param("id", checkId);

router.get("/", listUniversities);
router.get("/:id", getUniversity);
router.get("/:id/events", listUniversityEvents);

export default router;