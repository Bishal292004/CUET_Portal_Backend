import { University, Course } from "../models/index.js";
import { buildIndex, searchIndex } from "../utils/search.js";

// The names of all public universities and courses are kept in memory for a minute,
// so a search while someone types never hits the database
const TTL_MS = 60 * 1000;
let cache = { index: null, loadedAt: 0 };

async function getIndex() {
  if (cache.index && Date.now() - cache.loadedAt < TTL_MS) return cache.index;

  const [universities, courses] = await Promise.all([
    University.find({ verified: true, isArchived: false })
      .select("name shortName slug state city admissionStatus")
      .lean(),
    Course.find({ isActive: true }).select("name slug category").lean(),
  ]);

  cache = { index: buildIndex(universities, courses), loadedAt: Date.now() };
  return cache.index;
}

const TYPES = ["all", "universities", "courses"];

export async function search(req, res, next) {
  try {
    const { q, type = "all", limit } = req.query;

    if (typeof q !== "string" || q.trim().length < 2 || q.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: "Type 2 to 80 characters to search.",
      });
    }
    if (typeof type !== "string" || !TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be all, universities or courses.",
      });
    }

    const max = Math.min(Math.max(parseInt(limit, 10) || 8, 1), 20);
    const results = searchIndex(await getIndex(), q.trim(), { type, limit: max });

    return res.status(200).json({ success: true, data: { query: q.trim(), ...results } });
  } catch (error) {
    next(error);
  }
}
