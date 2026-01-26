/**
 * Validation Router
 * Handles file validation profiles and warnings
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getValidationProfiles,
  getValidationProfileById,
  createValidationProfile,
  updateValidationProfile,
  deleteValidationProfile,
  getDefaultValidationProfile,
  validateFile,
  saveFileWarnings,
  getFileWarnings,
  getFileWarningsByAttachment,
  acknowledgeWarning,
  acknowledgeAllWarnings,
} from "../db";

export const validationRouter = router({
  profiles: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view validation profiles");
        }
        return await getValidationProfiles();
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
          throw new Error("Only employees can view validation profiles");
        }
        return await getValidationProfileById(input.id);
      }),

    getDefault: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getDefaultValidationProfile();
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        minDpi: z.number().int().positive().default(300),
        maxDpi: z.number().int().positive().optional(),
        allowedColorspaces: z.array(z.string()).default(['CMYK']),
        requiredBleedMm: z.number().int().nonnegative().default(3),
        maxFileSizeMb: z.number().int().positive().default(100),
        allowedFormats: z.array(z.string()).default(['pdf', 'ai', 'eps', 'tiff']),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createValidationProfile(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        minDpi: z.number().int().positive().optional(),
        maxDpi: z.number().int().positive().optional(),
        allowedColorspaces: z.array(z.string()).optional(),
        requiredBleedMm: z.number().int().nonnegative().optional(),
        maxFileSizeMb: z.number().int().positive().optional(),
        allowedFormats: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateValidationProfile(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteValidationProfile(input.id);
      }),
  }),

  validateFile: protectedProcedure
    .input(z.object({
      filename: z.string(),
      fileSizeMb: z.number(),
      format: z.string(),
      dpi: z.number().optional(),
      colorspace: z.string().optional(),
      hasBleed: z.boolean().optional(),
      bleedMm: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      profileId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const { profileId, ...fileMetadata } = input;
      return await validateFile(fileMetadata, profileId);
    }),

  warnings: router({
    getByQuote: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getFileWarnings(input.quoteId);
      }),

    getByAttachment: protectedProcedure
      .input(z.object({ attachmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getFileWarningsByAttachment(input.attachmentId);
      }),

    save: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        attachmentId: z.number(),
        warnings: z.array(z.object({
          type: z.enum(['dpi', 'colorspace', 'bleed', 'format', 'filesize']),
          severity: z.enum(['warning', 'error']),
          message: z.string(),
          details: z.string().optional(),
          currentValue: z.string().optional(),
          requiredValue: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await saveFileWarnings(input.quoteId, input.attachmentId, input.warnings);
      }),

    acknowledge: protectedProcedure
      .input(z.object({ warningId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await acknowledgeWarning(input.warningId, ctx.user.id);
      }),

    acknowledgeAll: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await acknowledgeAllWarnings(input.quoteId, ctx.user.id);
      }),
  }),
});
