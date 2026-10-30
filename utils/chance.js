// Thresholds are in marks (out of 300): score minus the cutoff. Tune these as you like.
export const BANDS = { high: 10, moderate: -10, low: -30 };

export const RANK = { HIGH: 3, MODERATE: 2, LOW: 1, UNLIKELY: 0, NO_DATA: -1 };

function classify(difference) {
  if (difference >= BANDS.high) return "HIGH";
  if (difference >= BANDS.moderate) return "MODERATE";
  if (difference >= BANDS.low) return "LOW";
  return "UNLIKELY";
}

// Prefer the student's own category; otherwise fall back to General.
// Then take the most recent year, and within it the lowest round number.
export function pickCutoff(cutoffs, category) {
  const own = cutoffs.filter((c) => c.category === category);
  const pool = own.length ? own : cutoffs.filter((c) => c.category === "GEN");
  if (!pool.length) return null;
  return [...pool].sort((a, b) => b.year - a.year || a.round - b.round)[0];
}

export function estimateChance({ score, isExpected, cutoff, studentCategory }) {
  if (score === undefined) return { label: "NO_DATA", reason: "NO_SCORE" };
  if (!cutoff) return { label: "NO_DATA", reason: "NO_CUTOFF" };

  const difference = score - cutoff.closingScore;
  return {
    label: classify(difference),
    yourScore: score,
    isExpected: Boolean(isExpected),
    difference,
    cutoff: {
      closingScore: cutoff.closingScore,
      year: cutoff.year,
      round: cutoff.round,
      category: cutoff.category,
    },
    fallbackToGeneral: cutoff.category !== studentCategory,
  };
}