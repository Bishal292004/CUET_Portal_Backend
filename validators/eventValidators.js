import { z } from "zod";
import { EVENT_TYPES } from "../models/constants.js";
import { objectId, httpUrl, atLeastOneField, atLeastOneFieldMessage } from "./common.js";

// Catches typos like 2062 for 2026
const sensibleDate = (d) => d.getFullYear() >= 2022 && d.getFullYear() <= 2040;
const date = z.coerce.date().refine(sensibleDate, { message: "That date looks wrong." });

const fields = {
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000),
  startsAt: date,
  endsAt: date,
  sourceUrl: httpUrl,
  verified: z.boolean(),
};

export const createEventSchema = z
  .object({
    type: fields.type,
    title: fields.title,
    startsAt: fields.startsAt,
    sourceUrl: fields.sourceUrl, // every date must point to the official notice
    description: fields.description.optional(),
    endsAt: fields.endsAt.optional(),
    courseId: objectId.optional(), // leave out for a date that applies to the whole university
    verified: fields.verified.optional(),
  })
  .refine((e) => !e.endsAt || e.endsAt >= e.startsAt, {
    message: "endsAt cannot be before startsAt.",
  });

// courseId: null turns it back into a whole-university date
export const updateEventSchema = z
  .object(fields)
  .partial()
  .extend({ courseId: objectId.nullable().optional() })
  .refine(atLeastOneField, atLeastOneFieldMessage);
