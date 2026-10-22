export async function getMe(req, res) {
  const u = req.user;
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        category: u.category,
        preferredStates: u.preferredStates,
        interestedCourses: u.interestedCourses,
        cuetYear: u.cuetYear,
        cuetScores: u.cuetScores,
        emailNotifications: u.emailNotifications,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
      },
    },
  });
}