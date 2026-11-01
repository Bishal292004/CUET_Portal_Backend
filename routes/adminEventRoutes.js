import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { updateEventSchema } from "../validators/eventValidators.js";
import { updateEvent, deleteEvent } from "../controllers/adminEventController.js";

const router = Router();
router.param("id", checkId);

router.patch("/:id", validate(updateEventSchema), updateEvent);
router.delete("/:id", deleteEvent);

export default router;
