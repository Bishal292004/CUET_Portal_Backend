import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import adminUniversityRoutes from "./adminUniversityRoutes.js";
import adminCourseRoutes from "./adminCourseRoutes.js";
import adminUpdateRoutes from "./adminUpdateRoutes.js";
import adminProgrammeRoutes from "./adminProgrammeRoutes.js";
import adminEventRoutes from "./adminEventRoutes.js";
import adminCutoffRoutes from "./adminCutoffRoutes.js";
import adminEmailRoutes from "./adminEmailRoutes.js";
import adminUserRoutes from "./adminUserRoutes.js";
import adminAuditRoutes from "./adminAuditRoutes.js";

const router = Router();

router.use(authenticate, requireRole("editor", "admin"));

router.use("/universities", adminUniversityRoutes);
router.use("/courses", adminCourseRoutes);
router.use("/updates", adminUpdateRoutes);
router.use("/programmes", adminProgrammeRoutes);
router.use("/events", adminEventRoutes);
router.use("/cutoffs", adminCutoffRoutes);
router.use("/email", adminEmailRoutes);
router.use("/users", adminUserRoutes);
router.use("/audit-logs", adminAuditRoutes);

export default router;