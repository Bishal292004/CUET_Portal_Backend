import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format.");

// Only http/https links are accepted
export const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "URL must start with http:// or https://",
  });

export const atLeastOneField = (obj) => Object.keys(obj).length > 0;
export const atLeastOneFieldMessage = { message: "Provide at least one field to update." };
