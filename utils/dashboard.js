const STATUSES = ["NOT_STARTED", "OPEN", "MERIT_LIST_RELEASED", "CLOSED"];
const LABELS = ["HIGH", "MODERATE", "LOW", "UNLIKELY", "NO_DATA"];
const ACTIVE = new Set(["OPEN", "MERIT_LIST_RELEASED"]);

// Turns already-fetched data into the dashboard. It never touches the database,
// which keeps it easy to test and to change.
export function summariseDashboard({ user, results, upcoming, recent }) {
  // Each university once, even if the student's courses match several of its programmes
  const universities = new Map();
  for (const r of results) {
    const u = r.programme.university;
    universities.set(String(u._id), { ...u, inPreferredState: r.inPreferredState });
  }

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const u of universities.values()) {
    statusCounts[u.admissionStatus] = (statusCounts[u.admissionStatus] ?? 0) + 1;
  }

  const chanceCounts = Object.fromEntries(LABELS.map((l) => [l, 0]));
  for (const r of results) chanceCounts[r.chance.label] += 1;

  const hasCourses = user.interestedCourses.length > 0;
  const hasCategory = Boolean(user.category);
  const hasScores = user.cuetScores.length > 0;

  return {
    student: {
      name: user.name,
      category: user.category ?? null,
      assumedGeneral: !hasCategory,
    },
    // Lets the website show "finish setting up your profile" prompts
    setup: {
      hasCourses,
      hasCategory,
      hasScores,
      hasPreferredStates: user.preferredStates.length > 0,
      complete: hasCourses && hasCategory && hasScores,
    },
    stats: {
      universities: universities.size,
      programmes: results.length,
      statusCounts,
      chanceCounts,
    },
    // Best matches only: programmes where we could actually estimate something
    topMatches: results.filter((r) => r.chance.label !== "NO_DATA").slice(0, 5),
    // Universities whose admission is happening now
    activeUniversities: [...universities.values()]
      .filter((u) => ACTIVE.has(u.admissionStatus))
      .sort((a, b) => a.name.localeCompare(b.name)),
    events: { upcoming, recent },
  };
}
