import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { updateUserSchema } from "../validators/userAdminValidators.js";
import { listUsers, updateUser } from "../controllers/adminUserController.js";

const router = Router();
router.param("id", checkId);

router.use(requireRole("admin")); // editors manage content, not people

router.get("/", listUsers);
router.patch("/:id", validate(updateUserSchema), updateUser);

export default router;
