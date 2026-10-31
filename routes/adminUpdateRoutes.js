import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { patchUpdateSchema } from "../validators/updateValidators.js";
import {
  patchUpdate,
  deleteUpdate,
  retryNotifications,
} from "../controllers/adminUpdateController.js";

const router = Router();
router.param("id", checkId);

router.patch("/:id", validate(patchUpdateSchema), patchUpdate);
router.delete("/:id", deleteUpdate);
router.post("/:id/notify", retryNotifications);

export default router;
