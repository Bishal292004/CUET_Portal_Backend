import { Router } from "express";
import { listCourses } from "../controllers/courseController.js";

const router = Router();
router.get("/", listCourses);
export default router;