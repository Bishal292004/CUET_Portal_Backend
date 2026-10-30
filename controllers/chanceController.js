import { Programme, Cutoff } from "../models/index.js";
import { visibleProgrammeFilter } from "../utils/visibility.js";
import { isObjectId } from "../utils/isObjectId.js";
import { pickCutoff, estimateChance, RANK } from "../utils/chance.js";

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

    const studentCategory = req.user.category ?? "GEN";
    const meta = {
      studentCategory: req.user.category ?? null,
      assumedGeneral: !req.user.category,
      note:
        "These are estimates based on past cutoffs. Actual admission depends on this year's " +
        "applicants, seats and counselling rounds. Always confirm on the university's official notice.",
    };

    if (!courseIds.length) {
      return res.status(200).json({
        success: true,
        message: "Choose your courses to see estimates.",
        data: { results: [], ...meta },
      });
    }

    // 1. Programmes the student is allowed to see
    const filter = await visibleProgrammeFilter({ courseIds });
    const programmes = await Programme.find(filter)
      .select("university course programmeName durationYears totalSeats annualFee")
      .populate("university", "name shortName slug state city admissionStatus admissionUrl lastVerifiedAt")
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
    const scoreByCourse = new Map(req.user.cuetScores.map((s) => [String(s.course), s]));

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
        chance: estimateChance({
          score: mine?.score,
          isExpected: mine?.isExpected,
          cutoff,
          studentCategory,
        }),
      };
    });

    // Best chances first, then alphabetical by university
    results.sort(
      (a, b) =>
        RANK[b.chance.label] - RANK[a.chance.label] ||
        a.programme.university.name.localeCompare(b.programme.university.name)
    );

    return res.status(200).json({ success: true, data: { results, ...meta } });
  } catch (error) {
    next(error);
  }
}