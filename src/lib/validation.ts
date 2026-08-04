import { z } from "zod";

// Keep these in sync with the enums in prisma/schema.prisma.
export const projectStatusSchema = z.enum([
  "PLANNING",
  "IN_PROGRESS",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
]);

export const shotStatusSchema = z.enum([
  "PLANNED",
  "PROMPTING",
  "GENERATING",
  "REVIEW",
  "APPROVED",
  "NEEDS_REWORK",
]);

export const takeStatusSchema = z.enum([
  "GENERATING",
  "READY",
  "REJECTED",
  "SELECTED",
]);

export const MAX_TITLE_LENGTH = 200;
export const MAX_PROMPT_LENGTH = 30000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

export const promptSchema = z
  .string()
  .trim()
  .max(
    MAX_PROMPT_LENGTH,
    `Must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
  );

export const durationSchema = z.coerce
  .number("Duration must be a number.")
  .min(0, "Duration must be 0 or greater.")
  .max(3600, "Duration must be 3600 seconds or less.");

export const costSchema = z.coerce
  .number("Cost must be a number.")
  .min(0, "Cost must be 0 or greater.");
