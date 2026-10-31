import { z } from "zod";
import { UPDATE_TYPES } from "../models/constants.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format.");

// Only http/https links are accepted
const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "URL must start with http:// or https://",
  });

// A few minutes of slack for clock differences, but no scheduling into the future
const notInFuture = (d) => d.getTime() <= Date.now() + 5 * 60 * 1000;

const fields = {
  type: z.enum(UPDATE_TYPES),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().max(1000),
  sourceUrl: httpUrl,
  publishedAt: z.coerce.date().refine(notInFuture, { message: "publishedAt cannot be in the future." }),
};

export const createUpdateSchema = z.object({
  type: fields.type,
  title: fields.title,
  summary: fields.summary.optional(),
  sourceUrl: fields.sourceUrl.optional(),
  publishedAt: fields.publishedAt.optional(),
  courseId: objectId.optional(),
});

// The university and course of a published update cannot change: its notifications
// were already sent to the students who matched them.
export const patchUpdateSchema = z
  .object(fields)
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update.",
  });

export const followSchema = z.object({ universityId: objectId });
