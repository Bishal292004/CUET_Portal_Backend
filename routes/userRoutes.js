import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getMe } from "../controllers/userController.js";

const router = Router();

router.get("/", authenticate, getMe);

export default router;