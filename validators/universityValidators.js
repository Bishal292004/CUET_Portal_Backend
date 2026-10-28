import { z } from "zod";
import { ADMISSION_STATUS } from "../models/constants.js";

// Only http/https: stops "javascript:..." links from being stored
const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "URL must start with http:// or https://",
  });

export const createUniversitySchema = z.object({
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().max(30).optional(),
  state: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional(),
  type: z.enum(["CENTRAL", "STATE", "DEEMED", "PRIVATE", "OTHER"]).optional(),
  websiteUrl: httpUrl.optional(),
  admissionUrl: httpUrl.optional(),
  verified: z.boolean().optional(),
});

export const updateUniversitySchema = createUniversitySchema
  .partial()
  .extend({ isArchived: z.boolean().optional() })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update.",
  });

export const statusSchema = z.object({
  status: z.enum(ADMISSION_STATUS),
});