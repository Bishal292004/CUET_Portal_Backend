// import { Router } from "express";
// import { authenticate } from "../middleware/auth.js";
// import { getMe } from "../controllers/userController.js";

// const router = Router();

// router.get("/", authenticate, getMe);

// export default router;



import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  updateProfileSchema,
  coursesSchema,
  scoresSchema,
} from "../validators/profileValidators.js";
import { getMe, updateMe, setCourses, setScores } from "../controllers/userController.js";

const router = Router();

router.use(authenticate); // every route below needs a logged-in user

router.get("/", getMe);
router.patch("/", validate(updateProfileSchema), updateMe);
router.put("/courses", validate(coursesSchema), setCourses);
router.put("/scores", validate(scoresSchema), setScores);

export default router;