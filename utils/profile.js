import { User } from "../models/index.js";

export async function loadProfile(userId) {
  const u = await User.findById(userId)
    .populate("interestedCourses", "name slug category")
    .populate("cuetScores.course", "name slug cuetPaperCode");

  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    category: u.category,
    preferredStates: u.preferredStates,
    interestedCourses: u.interestedCourses,
    cuetYear: u.cuetYear,
    cuetScores: u.cuetScores.map((s) => ({
      course: s.course,
      score: s.score,
      isExpected: s.isExpected,
    })),
    emailNotifications: u.emailNotifications,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}