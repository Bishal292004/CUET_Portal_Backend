import { isObjectId } from "../utils/isObjectId.js";
import { computeChances, chanceMeta } from "../utils/chanceService.js";

export async function getChances(req, res, next) {
  try {
    const { courseId } = req.query;

    // Which courses? One, if requested; otherwise all the student's interested courses
    let courseIds;
    if (courseId !== undefined) {
      if (!isObjectId(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid courseId." });
      }
      courseIds = [courseId];
    } else {
      courseIds = req.user.interestedCourses.map(String);
    }

    const meta = chanceMeta(req.user);

    if (!courseIds.length) {
      return res.status(200).json({
        success: true,
        message: "Choose your courses to see estimates.",
        data: { results: [], ...meta },
      });
    }

    const results = await computeChances(req.user, courseIds);
    return res.status(200).json({ success: true, data: { results, ...meta } });
  } catch (error) {
    next(error);
  }
}
