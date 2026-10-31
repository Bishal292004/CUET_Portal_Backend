import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import adminUniversityRoutes from "./adminUniversityRoutes.js";
import adminCourseRoutes from "./adminCourseRoutes.js";
import adminUpdateRoutes from "./adminUpdateRoutes.js";

const router = Router();

router.use(authenticate, requireRole("editor", "admin"));

router.use("/universities", adminUniversityRoutes);
router.use("/courses", adminCourseRoutes);
router.use("/updates", adminUpdateRoutes);

export default router;