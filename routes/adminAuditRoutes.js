import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { listAuditLogs } from "../controllers/auditLogController.js";

const router = Router();

router.use(requireRole("admin"));

// Read only: there is deliberately no route that edits or deletes audit logs
router.get("/", listAuditLogs);

export default router;
