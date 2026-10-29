import { Router } from "express";
import { checkId } from "../middleware/checkId.js";
import { listProgrammes, listProgrammeCutoffs } from "../controllers/programmeController.js";

const router = Router();
router.param("id", checkId);

router.get("/", listProgrammes);
router.get("/:id/cutoffs", listProgrammeCutoffs);

export default router;