import { z } from "zod";
import { objectId, httpUrl, atLeastOneField, atLeastOneFieldMessage } from "./common.js";

const fields = z
  .object({
    programmeName: z.string().trim().min(2).max(150),
    durationYears: z.number().int().min(1).max(6),
    totalSeats: z.number().int().min(0).max(100000),
    seatsAvailable: z.number().int().min(0).max(100000),
    annualFee: z.number().min(0).max(10000000),
    eligibility: z.string().trim().max(1000),
    sourceUrl: httpUrl,
    verified: z.boolean(),
  })
  .partial();

export const createProgrammeSchema = fields
  .extend({ universityId: objectId, courseId: objectId })
  .refine((p) => p.seatsAvailable === undefined || p.totalSeats === undefined || p.seatsAvailable <= p.totalSeats, {
    message: "seatsAvailable cannot be more than totalSeats.",
  });

// The university and course of a programme cannot change: cutoffs are attached to it.
// To "move" a programme, archive it and create a new one.
export const updateProgrammeSchema = fields
  .extend({ isArchived: z.boolean().optional() })
  .refine(atLeastOneField, atLeastOneFieldMessage);
