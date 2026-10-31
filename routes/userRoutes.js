
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  updateProfileSchema,
  coursesSchema,
  scoresSchema,
} from "../validators/profileValidators.js";
import { getMe, updateMe, setCourses, setScores } from "../controllers/userController.js";

import { getChances } from "../controllers/chanceController.js";
import { getDashboard } from "../controllers/dashboardController.js";
import { getRecommendations } from "../controllers/recommendationController.js";
import subscriptionRoutes from "./subscriptionRoutes.js";
import notificationRoutes from "./notificationRoutes.js";



const router = Router();

router.use(authenticate); // every route below needs a logged-in user

router.get("/", getMe);
router.patch("/", validate(updateProfileSchema), updateMe);
router.put("/courses", validate(coursesSchema), setCourses);
router.put("/scores", validate(scoresSchema), setScores);
router.get("/chances", getChances);
router.get("/dashboard", getDashboard);
router.get("/recommendations", getRecommendations);
router.use("/subscriptions", subscriptionRoutes);
router.use("/notifications", notificationRoutes);

export default router;