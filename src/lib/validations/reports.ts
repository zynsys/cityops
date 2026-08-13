import { z } from "zod";

/**
 * Step 3 validation schema — shared between the client form (Step3Details)
 * and the server-side submission API in F-48.
 */
export const step3Schema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters.")
    .max(255, "Title must be 255 characters or fewer."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  locationText: z
    .string()
    .max(500, "Location label must be 500 characters or fewer.")
    .optional(),
});

export type Step3Input = z.infer<typeof step3Schema>;

/**
 * Full report creation schema — used by POST /api/reports.
 * Extends Step 3 fields with location coordinates and tenant/category IDs.
 */
export const createReportSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  title: z
    .string()
    .min(10, "Title must be at least 10 characters.")
    .max(255, "Title must be 255 characters or fewer."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  locationText: z
    .string()
    .max(500, "Location label must be 500 characters or fewer.")
    .optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Edit report schema — used by PATCH /api/reports/[id] (F-86).
 * Same as createReportSchema minus tenantId; adds removeAttachmentIds.
 */
export const editReportSchema = z.object({
  categoryId: z.string().uuid(),
  title: z
    .string()
    .min(10, "Title must be at least 10 characters.")
    .max(255, "Title must be 255 characters or fewer."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(2000, "Description must be 2000 characters or fewer."),
  locationText: z
    .string()
    .max(500, "Location label must be 500 characters or fewer.")
    .optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  removeAttachmentIds: z.array(z.string().uuid()).optional(),
});

export type EditReportInput = z.infer<typeof editReportSchema>;
