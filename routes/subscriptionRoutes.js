import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { followSchema } from "../validators/updateValidators.js";
import {
  listSubscriptions,
  subscribe,
  unsubscribe,
} from "../controllers/subscriptionController.js";

const router = Router();
router.param("universityId", checkId);

router.get("/", listSubscriptions);
router.post("/", validate(followSchema), subscribe);
router.delete("/:universityId", unsubscribe);

export default router;
