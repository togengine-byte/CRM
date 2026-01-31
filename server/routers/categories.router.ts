/**
 * Categories Router
 * Handles category management and validation settings
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, eq } from "../db/connection";
import { categories } from "../../drizzle/schema";

export const categoriesRouter = router({
  list: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(categories).orderBy(categories.displayOrder);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
      return result[0] || null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can create categories");
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(categories).values({
        name: input.name,
        description: input.description || null,
        icon: input.icon || null,
      }).returning();
      
      return result[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update categories");
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      updateData.updatedAt = new Date();
      
      await db.update(categories).set(updateData).where(eq(categories.id, id));
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can delete categories");
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(categories).where(eq(categories.id, input.id));
      
      return { success: true };
    }),

  // Update validation settings for a category
  updateValidation: protectedProcedure
    .input(z.object({
      id: z.number(),
      // Basic settings
      validationEnabled: z.boolean().optional(),
      minDpi: z.number().optional(),
      maxDpi: z.number().optional().nullable(),
      allowedColorspaces: z.array(z.string()).optional(),
      requiredBleedMm: z.number().optional(),
      requireBleed: z.boolean().optional(),
      requireCropMarks: z.boolean().optional(),
      requireRegistrationMarks: z.boolean().optional(),
      requireColorBars: z.boolean().optional(),
      requireEmbeddedFonts: z.boolean().optional(),
      allowOutlinedFonts: z.boolean().optional(),
      maxFileSizeMb: z.number().optional(),
      allowedFormats: z.array(z.string()).optional(),
      aspectRatioTolerance: z.number().optional(),
      // Advanced settings
      requireVectorFormat: z.boolean().optional(),
      maxColors: z.number().optional().nullable(),
      requireTransparentBackground: z.boolean().optional(),
      allowTransparentBackground: z.boolean().optional(),
      checkSpotColors: z.boolean().optional(),
      convertSpotToProcess: z.boolean().optional(),
      minLineWeightMm: z.number().optional().nullable(),
      minFontSizePt: z.number().optional().nullable(),
      safeZoneMm: z.number().optional().nullable(),
      checkOverprint: z.boolean().optional(),
      flattenTransparency: z.boolean().optional(),
      maxDimensionMm: z.number().optional().nullable(),
      minDimensionMm: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can update validation settings");
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...data } = input;
      const updateData: Record<string, any> = {};
      
      // Basic settings
      if (data.validationEnabled !== undefined) updateData.validationEnabled = data.validationEnabled;
      if (data.minDpi !== undefined) updateData.minDpi = data.minDpi;
      if (data.maxDpi !== undefined) updateData.maxDpi = data.maxDpi;
      if (data.allowedColorspaces !== undefined) updateData.allowedColorspaces = JSON.stringify(data.allowedColorspaces);
      if (data.requiredBleedMm !== undefined) updateData.requiredBleedMm = data.requiredBleedMm.toString();
      if (data.requireBleed !== undefined) updateData.requireBleed = data.requireBleed;
      if (data.requireCropMarks !== undefined) updateData.requireCropMarks = data.requireCropMarks;
      if (data.requireRegistrationMarks !== undefined) updateData.requireRegistrationMarks = data.requireRegistrationMarks;
      if (data.requireColorBars !== undefined) updateData.requireColorBars = data.requireColorBars;
      if (data.requireEmbeddedFonts !== undefined) updateData.requireEmbeddedFonts = data.requireEmbeddedFonts;
      if (data.allowOutlinedFonts !== undefined) updateData.allowOutlinedFonts = data.allowOutlinedFonts;
      if (data.maxFileSizeMb !== undefined) updateData.maxFileSizeMb = data.maxFileSizeMb;
      if (data.allowedFormats !== undefined) updateData.allowedFormats = JSON.stringify(data.allowedFormats);
      if (data.aspectRatioTolerance !== undefined) updateData.aspectRatioTolerance = data.aspectRatioTolerance.toString();
      
      // Advanced settings
      if (data.requireVectorFormat !== undefined) updateData.requireVectorFormat = data.requireVectorFormat;
      if (data.maxColors !== undefined) updateData.maxColors = data.maxColors;
      if (data.requireTransparentBackground !== undefined) updateData.requireTransparentBackground = data.requireTransparentBackground;
      if (data.allowTransparentBackground !== undefined) updateData.allowTransparentBackground = data.allowTransparentBackground;
      if (data.checkSpotColors !== undefined) updateData.checkSpotColors = data.checkSpotColors;
      if (data.convertSpotToProcess !== undefined) updateData.convertSpotToProcess = data.convertSpotToProcess;
      if (data.minLineWeightMm !== undefined) updateData.minLineWeightMm = data.minLineWeightMm?.toString() || null;
      if (data.minFontSizePt !== undefined) updateData.minFontSizePt = data.minFontSizePt?.toString() || null;
      if (data.safeZoneMm !== undefined) updateData.safeZoneMm = data.safeZoneMm?.toString() || null;
      if (data.checkOverprint !== undefined) updateData.checkOverprint = data.checkOverprint;
      if (data.flattenTransparency !== undefined) updateData.flattenTransparency = data.flattenTransparency;
      if (data.maxDimensionMm !== undefined) updateData.maxDimensionMm = data.maxDimensionMm;
      if (data.minDimensionMm !== undefined) updateData.minDimensionMm = data.minDimensionMm;
      
      updateData.updatedAt = new Date();
      
      await db.update(categories).set(updateData).where(eq(categories.id, id));
      
      return { success: true };
    }),

  // Get validation settings for a category
  getValidationSettings: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const result = await db.select().from(categories).where(eq(categories.id, input.id)).limit(1);
      if (!result[0]) return null;
      
      const cat = result[0] as any;
      
      // Parse JSON arrays
      const parseArray = (val: any): string[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return []; }
        }
        return [];
      };
      
      return {
        // Basic settings
        validationEnabled: cat.validationEnabled ?? true,
        minDpi: cat.minDpi ?? 300,
        maxDpi: cat.maxDpi,
        allowedColorspaces: parseArray(cat.allowedColorspaces),
        requiredBleedMm: parseFloat(String(cat.requiredBleedMm)) || 3,
        requireBleed: cat.requireBleed ?? true,
        requireCropMarks: cat.requireCropMarks ?? false,
        requireRegistrationMarks: cat.requireRegistrationMarks ?? false,
        requireColorBars: cat.requireColorBars ?? false,
        requireEmbeddedFonts: cat.requireEmbeddedFonts ?? true,
        allowOutlinedFonts: cat.allowOutlinedFonts ?? true,
        maxFileSizeMb: cat.maxFileSizeMb ?? 100,
        allowedFormats: parseArray(cat.allowedFormats),
        aspectRatioTolerance: parseFloat(String(cat.aspectRatioTolerance)) || 5,
        // Advanced settings
        requireVectorFormat: cat.requireVectorFormat ?? false,
        maxColors: cat.maxColors,
        requireTransparentBackground: cat.requireTransparentBackground ?? false,
        allowTransparentBackground: cat.allowTransparentBackground ?? true,
        checkSpotColors: cat.checkSpotColors ?? false,
        convertSpotToProcess: cat.convertSpotToProcess ?? true,
        minLineWeightMm: cat.minLineWeightMm ? parseFloat(String(cat.minLineWeightMm)) : null,
        minFontSizePt: cat.minFontSizePt ? parseFloat(String(cat.minFontSizePt)) : null,
        safeZoneMm: cat.safeZoneMm ? parseFloat(String(cat.safeZoneMm)) : null,
        checkOverprint: cat.checkOverprint ?? false,
        flattenTransparency: cat.flattenTransparency ?? false,
        maxDimensionMm: cat.maxDimensionMm,
        minDimensionMm: cat.minDimensionMm,
      };
    }),
});
