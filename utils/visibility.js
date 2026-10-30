import { University, Course } from "../models/index.js";

export async function visibleProgrammeFilter({ courseIds } = {}) {
  const courseFilter = { isActive: true };
  if (courseIds) courseFilter._id = { $in: courseIds };

  const [uniIds, activeCourseIds] = await Promise.all([
    University.distinct("_id", { verified: true, isArchived: false }),
    Course.distinct("_id", courseFilter),
  ]);

  return {
    verified: true,
    isArchived: false,
    university: { $in: uniIds },
    course: { $in: activeCourseIds },
  };
}