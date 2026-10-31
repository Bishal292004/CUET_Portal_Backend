import { Programme, Cutoff } from "../models/index.js";
import { visibleProgrammeFilter } from "./visibility.js";
import { pickCutoff, estimateChance, RANK } from "./chance.js";

// Shown with every estimate so the website can display the "this is an estimate" warning
export function chanceMeta(user) {
  return {
    studentCategory: user.category ?? null,
    assumedGeneral: !user.category,
    note:
      "These are estimates based on past cutoffs. Actual admission depends on this year's " +
      "applicants, seats and counselling rounds. Always confirm on the university's official notice.",
  };
}

// Every programme the student can see for the given courses, each with a chance estimate.
// Used by GET /api/me/chances and GET /api/me/dashboard, so the logic lives in one place.
export async function computeChances(user, courseIds) {
  const studentCategory = user.category ?? "GEN";
  const preferred = new Set(user.preferredStates ?? []);

  // 1. Programmes the student is allowed to see
  const filter = await visibleProgrammeFilter({ courseIds });
  const programmes = await Programme.find(filter)
    .select("university course programmeName durationYears totalSeats annualFee")
    .populate(
      "university",
      "name shortName slug state city admissionStatus admissionUrl statusUpdatedAt lastVerifiedAt"
    )
    .populate("course", "name slug")
    .limit(300)
    .lean();

  // 2. Their cutoffs (own category and General), grouped by programme
  const cutoffRows = await Cutoff.find({
    programme: { $in: programmes.map((p) => p._id) },
    verified: true,
    category: { $in: [studentCategory, "GEN"] },
  })
    .select("programme year round category closingScore")
    .lean();

  const cutoffsByProgramme = new Map();
  for (const c of cutoffRows) {
    const key = String(c.programme);
    if (!cutoffsByProgramme.has(key)) cutoffsByProgramme.set(key, []);
    cutoffsByProgramme.get(key).push(c);
  }

  // 3. The student's scores, by course
  const scoreByCourse = new Map((user.cuetScores ?? []).map((s) => [String(s.course), s]));

  // 4. Estimate each programme
  const results = programmes.map((p) => {
    const mine = scoreByCourse.get(String(p.course._id));
    const cutoff = pickCutoff(cutoffsByProgramme.get(String(p._id)) ?? [], studentCategory);

    return {
      programme: {
        id: p._id,
        programmeName: p.programmeName,
        durationYears: p.durationYears,
        totalSeats: p.totalSeats,
        annualFee: p.annualFee,
        university: p.university,
        course: p.course,
      },
      inPreferredState: preferred.has(p.university.state),
      chance: estimateChance({
        score: mine?.score,
        isExpected: mine?.isExpected,
        cutoff,
        studentCategory,
      }),
    };
  });

  // Best chance first, then universities in the student's preferred states, then A to Z
  results.sort(
    (a, b) =>
      RANK[b.chance.label] - RANK[a.chance.label] ||
      Number(b.inPreferredState) - Number(a.inPreferredState) ||
      a.programme.university.name.localeCompare(b.programme.university.name)
  );

  return results;
}
