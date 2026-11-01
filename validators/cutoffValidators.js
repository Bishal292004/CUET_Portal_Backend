import { z } from "zod";
import { CATEGORIES } from "../models/constants.js";
import { httpUrl, atLeastOneField, atLeastOneFieldMessage } from "./common.js";

const maxYear = new Date().getFullYear() + 1;

export const createCutoffSchema = z.object({
  year: z.number().int().min(2022).max(maxYear),
  round: z.number().int().min(1).max(10).default(1),
  category: z.enum(CATEGORIES),
  closingScore: z.number().min(0).max(300), // marks out of 300
  sourceUrl: httpUrl.optional(),
  verified: z.boolean().optional(),
});

// Year, round and category identify a cutoff, so they cannot be edited:
// delete the cutoff and create a new one instead.
export const updateCutoffSchema = z
  .object({
    closingScore: z.number().min(0).max(300),
    sourceUrl: httpUrl,
    verified: z.boolean(),
  })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);
