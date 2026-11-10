import { z } from "zod";

/** Unwrap a Zod error into a serialisable list for API responses. */
export interface FieldIssue {
  path: (string | number)[];
  message: string;
}

export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.filter(
      (segment): segment is string | number =>
        typeof segment === "string" || typeof segment === "number",
    ),
    message: issue.message,
  }));
}

/** Optional http(s) URL. Empty string is treated as "not provided". */
export const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
    message: "Must be a valid http(s) URL",
  });

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Email is required")
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Enter a valid email address",
  });
