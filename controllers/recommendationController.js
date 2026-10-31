import { Course, Subscription } from "../models/index.js";
import { isObjectId } from "../utils/isObjectId.js";
import { computeChances, chanceMeta } from "../utils/chanceService.js";
import { buildRecommendations } from "../utils/recommend.js";

export async function getRecommendations(req, res, next) {
  try {
    const { courseId, related, limit } = req.query;

    let targets;
    if (courseId !== undefined) {
      if (!isObjectId(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid courseId." });
      }
      targets = [courseId];
    } else {
      targets = req.user.interestedCourses.map(String);
    }

    const meta = chanceMeta(req.user);
    const includeRelated = related === "true";

    if (!targets.length) {
      return res.status(200).json({
        success: true,
        message: "Choose your courses to get recommendations.",
        data: { recommendations: [], includeRelated, ...meta },
      });
    }

    // Related courses = other active courses in the same category as the chosen ones
    let courseIds = targets;
    if (includeRelated) {
      const chosen = await Course.find({ _id: { $in: targets }, isActive: true })
        .select("category")
        .lean();
      const categories = [...new Set(chosen.map((c) => c.category).filter(Boolean))];

      if (categories.length) {
        const relatedIds = await Course.distinct("_id", {
          category: { $in: categories },
          isActive: true,
          _id: { $nin: targets },
        });
        courseIds = [...targets, ...relatedIds.map(String)];
      }
    }

    const [results, subscriptions] = await Promise.all([
      computeChances(req.user, courseIds),
      Subscription.find({ user: req.user._id }).select("university").lean(),
    ]);

    const recommendations = buildRecommendations({
      results,
      targetCourseIds: new Set(targets),
      followedUniversityIds: new Set(subscriptions.map((s) => String(s.university))),
      limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 30),
    });

    return res.status(200).json({
      success: true,
      data: { recommendations, includeRelated, ...meta },
    });
  } catch (error) {
    next(error);
  }
}
