import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import mongoose from "mongoose";
import { User, Course, University, Programme, Event, Cutoff } from "../models/index.js";
import { EVENT_TYPES, CATEGORIES } from "../models/constants.js";
import { slugify } from "../utils/slugify.js";

const DRY_RUN = process.argv.includes("--dry-run");
const MARK_VERIFIED = process.argv.includes("--verified");
const PLACEHOLDER = "PLACEHOLDER-TEST-DATA";
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");

// ---------- 1. Row rules (what a valid row looks like in each CSV) ----------
const httpUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), { message: "must start with http:// or https://" });

const courseSchema = z.object({
  slug: z.string(),
  name: z.string().min(2),
  category: z.string().optional(),
  cuetPaperCode: z.string().optional(),
});

const universitySchema = z.object({
  slug: z.string(),
  name: z.string().min(2),
  shortName: z.string().max(30).optional(),
  state: z.string(),
  city: z.string().optional(),
  type: z.enum(["CENTRAL", "STATE", "DEEMED", "PRIVATE", "OTHER"]).default("CENTRAL"),
  websiteUrl: httpUrl.optional(),
  admissionUrl: httpUrl.optional(),
  lastVerifiedAt: z.coerce.date().optional(),
});

const programmeSchema = z.object({
  universitySlug: z.string(),
  courseSlug: z.string(),
  programmeName: z.string().optional(),
  durationYears: z.coerce.number().int().min(1).optional(),
  totalSeats: z.coerce.number().int().min(0).optional(),
  annualFee: z.coerce.number().min(0).optional(),
  eligibility: z.string().optional(),
  sourceUrl: httpUrl.optional(),
  lastVerifiedAt: z.coerce.date().optional(),
});

const eventSchema = z.object({
  universitySlug: z.string(),
  courseSlug: z.string().optional(),
  type: z.enum(EVENT_TYPES),
  title: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  description: z.string().optional(),
  sourceUrl: httpUrl,
});

const cutoffSchema = z.object({
  universitySlug: z.string(),
  courseSlug: z.string(),
  year: z.coerce.number().int().default(2026),
  round: z.coerce.number().int().min(1).default(1),
  category: z.enum(CATEGORIES).default("GEN"),
  closingScore: z.coerce.number().min(0).max(300),
  sourceUrl: httpUrl.optional(),
});

// ---------- 2. Helpers ----------
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function readSheet(name, schema, errors) {
  const file = path.join(DATA_DIR, `${name}.csv`);
  if (!fs.existsSync(file)) {
    errors.push(`Missing file: data/${name}.csv`);
    return [];
  }
  const records = parse(fs.readFileSync(file), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const rows = [];
  records.forEach((record, i) => {
    const row = {};
    for (const [key, value] of Object.entries(record)) {
      const clean = String(value ?? "").replace(/\s+/g, " ").trim(); // also removes stray line breaks
      if (clean !== "") row[key.trim()] = clean;
    }
    if (Object.keys(row).length === 0) return; // blank row: skip

    const result = schema.safeParse(row);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${name} row ${i + 2}: ${issue.path.join(".") || "row"}: ${issue.message}`);
      }
      return;
    }
    rows.push({ ...result.data, _row: i + 2 }); // i + 2 = the row number you see in the sheet
  });
  return rows;
}

function findDuplicates(name, rows, keyFn, errors) {
  const seen = new Map();
  for (const r of rows) {
    const key = keyFn(r);
    if (seen.has(key)) errors.push(`${name} row ${r._row}: duplicate of row ${seen.get(key)} (${key})`);
    else seen.set(key, r._row);
  }
}

const stats = {};
async function upsert(label, Model, filter, set, setOnInsert, verifiable = true) {
  const $set = compact(set);
  const $ins = compact(setOnInsert);
  if (verifiable) {
    if (MARK_VERIFIED) $set.verified = true;
    else $ins.verified = false; // never un-verifies a record on re-run
  }
  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($ins).length) update.$setOnInsert = $ins;

  const res = await Model.updateOne(filter, update, {
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  stats[label] ??= { created: 0, updated: 0 };
  if (res.upsertedCount) stats[label].created++;
  else stats[label].updated++;
}

// ---------- 3. Main ----------
async function main() {
  const errors = [];

  const courses = readSheet("courses", courseSchema, errors);
  const universities = readSheet("universities", universitySchema, errors);
  const programmes = readSheet("programmes", programmeSchema, errors);
  const events = readSheet("events", eventSchema, errors);
  const cutoffs = readSheet("cutoffs", cutoffSchema, errors);

  // Slugs must match the name (same rule the admin routes use)
  for (const r of courses) {
    if (r.slug !== slugify(r.name)) errors.push(`courses row ${r._row}: slug should be "${slugify(r.name)}"`);
  }
  for (const r of universities) {
    if (r.slug !== slugify(r.name)) errors.push(`universities row ${r._row}: slug should be "${slugify(r.name)}"`);
  }

  // Duplicates
  findDuplicates("courses", courses, (r) => r.slug, errors);
  findDuplicates("universities", universities, (r) => r.slug, errors);
  findDuplicates("programmes", programmes, (r) => `${r.universitySlug} + ${r.courseSlug}`, errors);
  findDuplicates(
    "events",
    events,
    (r) => `${r.universitySlug}|${r.courseSlug ?? ""}|${r.type}|${r.title}|${r.startsAt.toISOString()}`,
    errors
  );
  findDuplicates(
    "cutoffs",
    cutoffs,
    (r) => `${r.universitySlug} + ${r.courseSlug} + ${r.year} + ${r.round} + ${r.category}`,
    errors
  );

  // Every slug used must exist, and events/cutoffs must point at a real programme
  const courseSlugs = new Set(courses.map((r) => r.slug));
  const uniSlugs = new Set(universities.map((r) => r.slug));
  const pairs = new Set(programmes.map((r) => `${r.universitySlug}|${r.courseSlug}`));

  for (const [name, rows] of [["programmes", programmes], ["events", events], ["cutoffs", cutoffs]]) {
    for (const r of rows) {
      if (!uniSlugs.has(r.universitySlug)) errors.push(`${name} row ${r._row}: unknown universitySlug "${r.universitySlug}"`);
      if (r.courseSlug && !courseSlugs.has(r.courseSlug)) errors.push(`${name} row ${r._row}: unknown courseSlug "${r.courseSlug}"`);
    }
  }
  for (const r of [...events.filter((e) => e.courseSlug), ...cutoffs]) {
    if (!pairs.has(`${r.universitySlug}|${r.courseSlug}`)) {
      errors.push(`row ${r._row} (${r.universitySlug} + ${r.courseSlug}): no matching row in programmes`);
    }
  }

  // Make sure the models have the fields we are about to write (otherwise Mongoose drops them silently)
  const needed = [
    [University, "lastVerifiedAt"],
    [Programme, "lastVerifiedAt"],
    [Programme, "sourceUrl"],
  ];
  for (const [Model, field] of needed) {
    if (!Model.schema.path(field)) errors.push(`${Model.modelName} model is missing the "${field}" field`);
  }

  console.log(
    `Rows read: ${courses.length} courses, ${universities.length} universities, ${programmes.length} programmes, ` +
      `${events.length} events, ${cutoffs.length} cutoffs`
  );

  if (errors.length) {
    console.error(`\n${errors.length} problem(s) found. Nothing was written:\n`);
    errors.forEach((e) => console.error(" - " + e));
    process.exit(1);
  }
  console.log("Validation passed.");

  if (DRY_RUN) {
    console.log("Dry run: nothing was written.");
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await User.findOne({ role: "admin" }).select("_id");
  if (!admin) console.warn("No admin user found: createdBy/updatedBy will be left empty.");
  const by = admin?._id;

  for (const r of courses) {
    await upsert("courses", Course, { slug: r.slug },
      { name: r.name, category: r.category, cuetPaperCode: r.cuetPaperCode }, {}, false);
  }

  for (const r of universities) {
    await upsert("universities", University, { slug: r.slug },
      {
        name: r.name, shortName: r.shortName, state: r.state, city: r.city, type: r.type,
        websiteUrl: r.websiteUrl, admissionUrl: r.admissionUrl,
        lastVerifiedAt: r.lastVerifiedAt, updatedBy: by,
      },
      { admissionStatus: "NOT_STARTED", createdBy: by });
  }

  const courseId = new Map((await Course.find().select("slug")).map((d) => [d.slug, d._id]));
  const uniId = new Map((await University.find().select("slug")).map((d) => [d.slug, d._id]));

  for (const r of programmes) {
    await upsert("programmes", Programme,
      { university: uniId.get(r.universitySlug), course: courseId.get(r.courseSlug) },
      {
        programmeName: r.programmeName, durationYears: r.durationYears, totalSeats: r.totalSeats,
        annualFee: r.annualFee, eligibility: r.eligibility, sourceUrl: r.sourceUrl,
        lastVerifiedAt: r.lastVerifiedAt, updatedBy: by,
      }, {});
  }

  for (const r of events) {
    const filter = {
      university: uniId.get(r.universitySlug),
      type: r.type, title: r.title, startsAt: r.startsAt,
      course: r.courseSlug ? courseId.get(r.courseSlug) : { $exists: false },
    };
    await upsert("events", Event, filter,
      { endsAt: r.endsAt, description: r.description, sourceUrl: r.sourceUrl },
      { createdBy: by });
  }

  const progId = new Map(
    (await Programme.find().select("university course")).map((d) => [`${d.university}|${d.course}`, d._id])
  );

  for (const r of cutoffs) {
    const programme = progId.get(`${uniId.get(r.universitySlug)}|${courseId.get(r.courseSlug)}`);
    await upsert("cutoffs", Cutoff,
      { programme, year: r.year, round: r.round, category: r.category },
      { closingScore: r.closingScore, sourceUrl: r.sourceUrl ?? PLACEHOLDER },
      { createdBy: by });
  }

  console.log("\nDone:");
  console.table(stats);
  if (!MARK_VERIFIED) console.log("Everything was imported as verified: false. Re-run with --verified to publish it.");
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}