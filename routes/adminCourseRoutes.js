import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { checkId } from "../middleware/checkId.js";
import { createCourseSchema, updateCourseSchema } from "../validators/courseValidators.js";
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  archiveCourse,
} from "../controllers/adminCourseController.js";

const router = Router();

router.param("id", checkId);

router.get("/", listCourses);
router.post("/", validate(createCourseSchema), createCourse);
router.get("/:id", getCourse);
router.patch("/:id", validate(updateCourseSchema), updateCourse);
router.delete("/:id", archiveCourse);

export default router;