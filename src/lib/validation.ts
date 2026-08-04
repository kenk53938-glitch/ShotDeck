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
export const MAX_PROMPT_LENGTH = 4000;

export const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH);
export const promptSchema = z.string().trim().max(MAX_PROMPT_LENGTH);
export const durationSchema = z.coerce.number().min(0).max(3600);
export const costSchema = z.coerce.number().min(0);
