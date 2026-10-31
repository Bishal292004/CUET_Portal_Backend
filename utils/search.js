// Typo-tolerant search over a small in-memory list. No database access in this file.

// Words people type that mean something longer. Edit freely.
const SYNONYMS = {
  cs: "computer science",
  compsci: "computer science",
  polsci: "political science",
  cu: "central university",
};
const STOPWORDS = new Set(["of", "the", "and", "in", "at", "for", "a"]);

// "M.Sc. Maths!" -> "msc maths"
export function normalise(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Very light stemming so "universities" matches "university" and "physics" matches "physic"
function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokens(text) {
  return normalise(text).split(" ").filter(Boolean).map(stem);
}

// Edit distance where swapping two neighbouring letters counts as ONE mistake
export function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

// How well does one typed word match one word of a name? 0 means no match.
function wordScore(q, c) {
  if (q === c) return 1;
  if (q.length >= 2 && c.startsWith(q)) return 0.85; // still typing: "pondi"
  const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0; // short words must be exact
  if (allowed) {
    const d = distance(q, c, allowed);
    if (d <= allowed) return 0.7 - 0.15 * d; // a typo: "pondichery"
  }
  return 0;
}

function makeEntry(item, fields) {
  const name = normalise(item.name);
  return {
    item,
    compact: name.replace(/ /g, ""),
    fields: fields.map((f) => ({ weight: f.weight, words: tokens(f.text) })),
  };
}

// universities: { name, shortName, state, city, ... }   courses: { name, category, ... }
export function buildIndex(universities, courses) {
  return {
    universities: universities.map((u) =>
      makeEntry(u, [
        { text: u.name, weight: 1 },
        { text: u.shortName, weight: 1 },
        { text: u.state, weight: 0.5 },
        { text: u.city, weight: 0.5 },
      ])
    ),
    courses: courses.map((c) =>
      makeEntry(c, [
        { text: c.name, weight: 1 },
        { text: c.category, weight: 0.5 },
      ])
    ),
  };
}

function queryWords(q) {
  const words = [];
  for (const raw of normalise(q).split(" ").filter(Boolean)) {
    if (STOPWORDS.has(raw) || raw.length < 2) continue; // ignore "of", "in", single letters
    const expansion = SYNONYMS[raw];
    words.push(...(expansion ? tokens(expansion) : [stem(raw)]));
  }
  return words;
}

function scoreEntry(entry, words, compactQuery) {
  // Way 1: every typed word must match some word of the name (or state, city, category)
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const f of entry.fields) {
      for (const c of f.words) best = Math.max(best, wordScore(w, c) * f.weight);
    }
    if (best === 0) {
      total = 0;
      break;
    }
    total += best;
  }
  const byWords = words.length ? total / words.length : 0;

  // Way 2: ignore spaces and dots altogether, so "msc math" and "m.sc. math" find "M.Sc. Mathematics"
  let byShape = 0;
  if (compactQuery.length >= 3) {
    if (entry.compact.startsWith(compactQuery)) byShape = 0.9;
    else if (entry.compact.includes(compactQuery)) byShape = 0.7;
  }

  return Math.max(byWords, byShape);
}

function rank(entries, words, compactQuery, limit) {
  return entries
    .map((e) => ({ item: e.item, score: scoreEntry(e, words, compactQuery) }))
    .filter((r) => r.score >= 0.35)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((r) => r.item);
}

export function searchIndex(index, q, { type = "all", limit = 8 } = {}) {
  const words = queryWords(q);
  const compactQuery = normalise(q).replace(/ /g, "");
  return {
    universities:
      type === "courses" ? [] : rank(index.universities, words, compactQuery, limit),
    courses:
      type === "universities" ? [] : rank(index.courses, words, compactQuery, limit),
  };
}
