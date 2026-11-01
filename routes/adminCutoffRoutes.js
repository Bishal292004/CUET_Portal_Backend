import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { updateCutoffSchema } from "../validators/cutoffValidators.js";
import { updateCutoff, deleteCutoff } from "../controllers/adminCutoffController.js";

const router = Router();
router.param("id", checkId);

router.patch("/:id", validate(updateCutoffSchema), updateCutoff);
router.delete("/:id", deleteCutoff);

export default router;
