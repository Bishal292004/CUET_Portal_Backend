import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().max(100).optional(),
  cuetPaperCode: z.string().trim().max(20).optional(),
});

export const updateCourseSchema = createCourseSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update.",
  });