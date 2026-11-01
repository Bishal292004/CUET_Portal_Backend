import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { emailStatus, retryFailed } from "../controllers/adminEmailController.js";

const router = Router();

router.use(requireRole("admin")); // editors can publish updates but cannot see email delivery details

router.get("/status", emailStatus);
router.post("/retry-failed", retryFailed);

export default router;
