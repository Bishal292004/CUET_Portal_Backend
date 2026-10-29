import { z } from "zod";
import { CATEGORIES } from "../models/constants.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format.");
const unique = (arr) => [...new Set(arr)];
const maxYear = new Date().getFullYear() + 1;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    category: z.enum(CATEGORIES),
    preferredStates: z
      .array(z.string().trim().min(1).max(100))
      .max(40)
      .transform(unique),
    emailNotifications: z.boolean(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update.",
  });

export const coursesSchema = z.object({
  courseIds: z.array(objectId).max(20).transform(unique),
});

export const scoresSchema = z
  .object({
    cuetYear: z.number().int().min(2022).max(maxYear).optional(),
    scores: z
      .array(
        z.object({
          courseId: objectId,
          score: z.number().min(0).max(300),
          isExpected: z.boolean().optional(),
        })
      )
      .max(20),
  })
  .refine(
    (obj) => new Set(obj.scores.map((s) => s.courseId)).size === obj.scores.length,
    { message: "Each course can appear only once in scores." }
  );