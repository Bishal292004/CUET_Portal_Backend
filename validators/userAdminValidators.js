import { z } from "zod";
import { ROLES } from "../models/constants.js";

// Only these two things can be changed here. Name, email and password belong to the student.
export const updateUserSchema = z
  .object({
    role: z.enum(ROLES),
    isActive: z.boolean(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide role or isActive.",
  });
