import { z } from "zod";
import { optionalHttpUrl } from "./common";

/**
 * Partial update for the master career profile.
 *
 * Field names are camelCase at the API boundary; the core layer maps them to
 * snake_case columns. `null` clears a field, omission leaves it untouched.
 */
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).nullable(),
    phone: z.string().trim().max(40).nullable(),
    city: z.string().trim().max(120).nullable(),
    country: z.string().trim().min(1).max(120).nullable(),
    headline: z.string().trim().max(160).nullable(),
    summary: z.string().trim().max(4000).nullable(),
    currentDesignation: z.string().trim().max(160).nullable(),
    currentCompany: z.string().trim().max(160).nullable(),
    totalExperienceMonths: z.number().int().min(0).max(720).nullable(),
    noticePeriodDays: z.number().int().min(0).max(365).nullable(),
    linkedinUrl: optionalHttpUrl.nullable(),
    githubUrl: optionalHttpUrl.nullable(),
    portfolioUrl: optionalHttpUrl.nullable(),
  })
  .partial()
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
