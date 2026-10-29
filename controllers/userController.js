// export async function getMe(req, res) {
//   const u = req.user;
//   return res.status(200).json({
//     success: true,
//     data: {
//       user: {
//         id: u._id,
//         name: u.name,
//         email: u.email,
//         role: u.role,
//         category: u.category,
//         preferredStates: u.preferredStates,
//         interestedCourses: u.interestedCourses,
//         cuetYear: u.cuetYear,
//         cuetScores: u.cuetScores,
//         emailNotifications: u.emailNotifications,
//         emailVerified: u.emailVerified,
//         createdAt: u.createdAt,
//       },
//     },
//   });
// }



import { User, Course, University } from "../models/index.js";
import { loadProfile } from "../utils/profile.js";

const badRequest = (res, message) => res.status(400).json({ success: false, message });

export async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: { user: await loadProfile(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    if (req.body.preferredStates) {
      const known = await University.distinct("state", { verified: true, isArchived: false });
      const unknown = req.body.preferredStates.filter((s) => !known.includes(s));
      if (unknown.length) return badRequest(res, `Unknown state: ${unknown.join(", ")}`);
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $set: req.body }, // only the fields the validator allowed
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated.",
      data: { user: await loadProfile(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
}

export async function setCourses(req, res, next) {
  try {
    const { courseIds } = req.body;

    const found = await Course.countDocuments({ _id: { $in: courseIds }, isActive: true });
    if (found !== courseIds.length) return badRequest(res, "One or more courses are invalid.");

    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { interestedCourses: courseIds } },
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Interested courses saved.",
      data: { user: await loadProfile(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
}

export async function setScores(req, res, next) {
  try {
    const { cuetYear, scores } = req.body;

    const ids = scores.map((s) => s.courseId);
    const found = await Course.countDocuments({ _id: { $in: ids }, isActive: true });
    if (found !== ids.length) return badRequest(res, "One or more courses are invalid.");

    const set = {
      cuetScores: scores.map((s) => ({
        course: s.courseId,
        score: s.score,
        isExpected: s.isExpected ?? false,
      })),
    };
    if (cuetYear !== undefined) set.cuetYear = cuetYear;

    await User.findByIdAndUpdate(req.user._id, { $set: set }, { runValidators: true });

    return res.status(200).json({
      success: true,
      message: "Scores saved.",
      data: { user: await loadProfile(req.user._id) },
    });
  } catch (error) {
    next(error);
  }
}