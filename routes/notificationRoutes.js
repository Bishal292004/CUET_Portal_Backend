import { Router } from "express";
import { checkId } from "../middleware/checkId.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from "../controllers/notificationController.js";

const router = Router();
router.param("id", checkId);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
