import { Event, Notification, Subscription } from "../models/index.js";
import { computeChances, chanceMeta } from "../utils/chanceService.js";
import { summariseDashboard } from "../utils/dashboard.js";

const EVENT_FIELDS = "university course type title description startsAt endsAt sourceUrl";
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboard(req, res, next) {
  try {
    const user = req.user;
    const courseIds = user.interestedCourses.map(String);

    let results = [];
    let upcoming = [];
    let recent = [];

    if (courseIds.length) {
      results = await computeChances(user, courseIds);

      const universityIds = [...new Set(results.map((r) => String(r.programme.university._id)))];

      if (universityIds.length) {
        const now = new Date();

        // Dates for the student's universities: whole-university dates (no course)
        // plus dates for the courses the student chose. Never dates for other courses.
        const base = {
          university: { $in: universityIds },
          verified: true,
          $or: [{ course: null }, { course: { $in: courseIds } }],
        };

        const find = (extra, order, limit) =>
          Event.find({ ...base, ...extra })
            .select(EVENT_FIELDS)
            .populate("university", "name shortName slug")
            .populate("course", "name slug")
            .sort({ startsAt: order })
            .limit(limit)
            .lean();

        [upcoming, recent] = await Promise.all([
          find({ startsAt: { $gte: now } }, 1, 10),
          find({ startsAt: { $lt: now, $gte: new Date(now.getTime() - 365 * DAY_MS) } }, -1, 5),
        ]);
      }
    }

    const [unreadNotifications, followingCount] = await Promise.all([
      Notification.countDocuments({ user: user._id, readAt: null }),
      Subscription.countDocuments({ user: user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...summariseDashboard({ user, results, upcoming, recent }),
        unreadNotifications,
        followingCount,
        ...chanceMeta(user),
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}
