// Rule-based "other universities worth a look". No database access in this file.
const POINTS = { sameCourse: 40, relatedCourse: 20, preferredState: 20, activeAdmission: 5 };
const CHANCE_POINTS = { HIGH: 30, MODERATE: 25, LOW: 10, UNLIKELY: 0, NO_DATA: 5 };
const MAX_PER_UNIVERSITY = 2;

const ACTIVE_REASON = {
  OPEN: "Admission is open now",
  MERIT_LIST_RELEASED: "Merit list has been released",
};

function chanceReason(chance) {
  const suffix = chance.isExpected ? " (based on your expected score)" : "";
  if (chance.label === "HIGH") return `Your score is above last year's cutoff${suffix}`;
  if (chance.label === "MODERATE") return `Your score is close to last year's cutoff${suffix}`;
  if (chance.label === "LOW") return `Below last year's cutoff, but within reach${suffix}`;
  return null;
}

// results: from computeChances. Only universities the student does NOT already follow are
// suggested, and programmes the student is very unlikely to get into are left out.
export function buildRecommendations({ results, targetCourseIds, followedUniversityIds, limit }) {
  const scored = [];

  for (const r of results) {
    const university = r.programme.university;
    const course = r.programme.course;

    if (followedUniversityIds.has(String(university._id))) continue;
    if (r.chance.label === "UNLIKELY") continue;

    const sameCourse = targetCourseIds.has(String(course._id));
    const reasons = [];
    let score = 0;

    if (sameCourse) {
      score += POINTS.sameCourse;
      reasons.push(`Offers ${course.name}`);
    } else {
      score += POINTS.relatedCourse;
      reasons.push(`Related course: ${course.name}${course.category ? ` (${course.category})` : ""}`);
    }

    score += CHANCE_POINTS[r.chance.label] ?? 0;
    const why = chanceReason(r.chance);
    if (why) reasons.push(why);

    if (r.inPreferredState) {
      score += POINTS.preferredState;
      reasons.push(`In your preferred state: ${university.state}`);
    }

    if (ACTIVE_REASON[university.admissionStatus]) {
      score += POINTS.activeAdmission;
      reasons.push(ACTIVE_REASON[university.admissionStatus]);
    }

    scored.push({
      relation: sameCourse ? "SAME_COURSE" : "RELATED_COURSE",
      score,
      reasons,
      programme: r.programme,
      chance: r.chance,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.programme.university.name.localeCompare(b.programme.university.name));

  // At most two programmes per university, so one university cannot fill the list
  const perUniversity = new Map();
  const picked = [];
  for (const item of scored) {
    const key = String(item.programme.university._id);
    const count = perUniversity.get(key) ?? 0;
    if (count >= MAX_PER_UNIVERSITY) continue;
    perUniversity.set(key, count + 1);
    picked.push(item);
    if (picked.length === limit) break;
  }
  return picked;
}
