/**
 * File Validation Router
 * Handles file validation requests and returns detailed analysis
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, eq } from "../db/connection";
import { categories, baseProducts } from "../../drizzle/schema";
import * as fs from 'fs';
import * as path from 'path';

// Types for validation
interface ValidationSettings {
  validationEnabled: boolean;
  minDpi: number;
  maxDpi?: number;
  allowedColorspaces: string[];
  requiredBleedMm: number;
  requireBleed: boolean;
  requireCropMarks: boolean;
  requireRegistrationMarks: boolean;
  requireColorBars: boolean;
  requireEmbeddedFonts: boolean;
  allowOutlinedFonts: boolean;
  maxFileSizeMb: number;
  allowedFormats: string[];
  aspectRatioTolerance: number;
}

interface FileAnalysis {
  filename: string;
  format: string;
  fileSizeMb: number;
  widthPx?: number;
  heightPx?: number;
  widthMm?: number;
  heightMm?: number;
  declaredDpi?: number;
  colorspace?: string;
  hasBleed?: boolean;
  bleedMm?: number;
  hasCropMarks?: boolean;
  hasRegistrationMarks?: boolean;
  hasColorBars?: boolean;
  fontsEmbedded?: boolean;
  fontsOutlined?: boolean;
  pageCount?: number;
}

interface ValidationWarning {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string;
  currentValue: string;
  requiredValue: string;
}

interface ValidationResult {
  status: 'approved' | 'warning' | 'error';
  isValid: boolean;
  analysis: FileAnalysis;
  warnings: ValidationWarning[];
  errors: ValidationWarning[];
  calculatedDpi?: number;
}

// Helper to parse JSON arrays
const parseArraySafe = (val: unknown): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
};

// Get merged validation settings for a product
async function getProductValidationSettings(productId: number): Promise<ValidationSettings | null> {
  const db = await getDb();
  if (!db) return null;

  // Get product
  const productResult = await db.select().from(baseProducts).where(eq(baseProducts.id, productId)).limit(1);
  if (!productResult[0]) return null;
  
  const product = productResult[0];
  
  // Get category settings
  let categorySettings: ValidationSettings | null = null;
  if (product.categoryId) {
    const catResult = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
    if (catResult[0]) {
      const cat = catResult[0];
      categorySettings = {
        validationEnabled: cat.validationEnabled ?? true,
        minDpi: cat.minDpi ?? 300,
        maxDpi: cat.maxDpi ?? undefined,
        allowedColorspaces: parseArraySafe(cat.allowedColorspaces) || ['CMYK'],
        requiredBleedMm: parseFloat(String(cat.requiredBleedMm)) || 3,
        requireBleed: cat.requireBleed ?? true,
        requireCropMarks: cat.requireCropMarks ?? false,
        requireRegistrationMarks: cat.requireRegistrationMarks ?? false,
        requireColorBars: cat.requireColorBars ?? false,
        requireEmbeddedFonts: cat.requireEmbeddedFonts ?? true,
        allowOutlinedFonts: cat.allowOutlinedFonts ?? true,
        maxFileSizeMb: cat.maxFileSizeMb ?? 100,
        allowedFormats: parseArraySafe(cat.allowedFormats) || ['pdf', 'ai', 'eps', 'tiff', 'jpg', 'png'],
        aspectRatioTolerance: parseFloat(String(cat.aspectRatioTolerance)) || 5,
      };
    }
  }

  // If product has override, merge product settings
  if (product.validationOverride) {
    const productSettings: Partial<ValidationSettings> = {};
    if (product.minDpi !== null) productSettings.minDpi = product.minDpi;
    if (product.maxDpi !== null) productSettings.maxDpi = product.maxDpi ?? undefined;
    if (product.allowedColorspaces !== null) productSettings.allowedColorspaces = parseArraySafe(product.allowedColorspaces);
    if (product.requiredBleedMm !== null) productSettings.requiredBleedMm = parseFloat(String(product.requiredBleedMm));
    if (product.requireBleed !== null) productSettings.requireBleed = product.requireBleed;
    if (product.requireCropMarks !== null) productSettings.requireCropMarks = product.requireCropMarks;
    if (product.requireRegistrationMarks !== null) productSettings.requireRegistrationMarks = product.requireRegistrationMarks;
    if (product.requireColorBars !== null) productSettings.requireColorBars = product.requireColorBars;
    if (product.requireEmbeddedFonts !== null) productSettings.requireEmbeddedFonts = product.requireEmbeddedFonts;
    if (product.allowOutlinedFonts !== null) productSettings.allowOutlinedFonts = product.allowOutlinedFonts;
    if (product.maxFileSizeMb !== null) productSettings.maxFileSizeMb = product.maxFileSizeMb;
    if (product.allowedFormats !== null) productSettings.allowedFormats = parseArraySafe(product.allowedFormats);
    if (product.aspectRatioTolerance !== null) productSettings.aspectRatioTolerance = parseFloat(String(product.aspectRatioTolerance));

    return { ...categorySettings!, ...productSettings };
  }

  return categorySettings;
}

// Calculate real DPI
function calculateRealDpi(widthPx: number, heightPx: number, targetWidthMm: number, targetHeightMm: number) {
  const targetWidthInches = targetWidthMm / 25.4;
  const targetHeightInches = targetHeightMm / 25.4;
  const dpiWidth = widthPx / targetWidthInches;
  const dpiHeight = heightPx / targetHeightInches;
  return {
    dpiWidth: Math.round(dpiWidth),
    dpiHeight: Math.round(dpiHeight),
    avgDpi: Math.round((dpiWidth + dpiHeight) / 2),
  };
}

// Check aspect ratio
function checkAspectRatio(fileWidth: number, fileHeight: number, targetWidth: number, targetHeight: number, tolerancePercent: number) {
  const fileRatio = fileWidth / fileHeight;
  const targetRatio = targetWidth / targetHeight;
  const deviationPercent = Math.abs((fileRatio - targetRatio) / targetRatio) * 100;
  return {
    isCompatible: deviationPercent <= tolerancePercent,
    fileRatio: Math.round(fileRatio * 100) / 100,
    targetRatio: Math.round(targetRatio * 100) / 100,
    deviationPercent: Math.round(deviationPercent * 10) / 10,
  };
}

export const fileValidationRouter = router({
  // Get validation settings for a product (with category inheritance)
  getSettings: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return await getProductValidationSettings(input.productId);
    }),

  // Validate file metadata (without actual file)
  validateMetadata: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      categoryId: z.number().optional(),
      filename: z.string(),
      fileSizeMb: z.number(),
      widthPx: z.number().optional(),
      heightPx: z.number().optional(),
      targetWidthMm: z.number().optional(),
      targetHeightMm: z.number().optional(),
      colorspace: z.string().optional(),
      hasBleed: z.boolean().optional(),
      bleedMm: z.number().optional(),
      hasCropMarks: z.boolean().optional(),
      hasRegistrationMarks: z.boolean().optional(),
      fontsEmbedded: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get validation settings
      let settings: ValidationSettings | null = null;
      
      if (input.productId) {
        settings = await getProductValidationSettings(input.productId);
      } else if (input.categoryId) {
        const catResult = await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
        if (catResult[0]) {
          const cat = catResult[0];
          settings = {
            validationEnabled: cat.validationEnabled ?? true,
            minDpi: cat.minDpi ?? 300,
            maxDpi: cat.maxDpi ?? undefined,
            allowedColorspaces: parseArraySafe(cat.allowedColorspaces) || ['CMYK'],
            requiredBleedMm: parseFloat(String(cat.requiredBleedMm)) || 3,
            requireBleed: cat.requireBleed ?? true,
            requireCropMarks: cat.requireCropMarks ?? false,
            requireRegistrationMarks: cat.requireRegistrationMarks ?? false,
            requireColorBars: cat.requireColorBars ?? false,
            requireEmbeddedFonts: cat.requireEmbeddedFonts ?? true,
            allowOutlinedFonts: cat.allowOutlinedFonts ?? true,
            maxFileSizeMb: cat.maxFileSizeMb ?? 100,
            allowedFormats: parseArraySafe(cat.allowedFormats) || ['pdf', 'ai', 'eps', 'tiff', 'jpg', 'png'],
            aspectRatioTolerance: parseFloat(String(cat.aspectRatioTolerance)) || 5,
          };
        }
      }

      // Default settings if none found
      if (!settings) {
        settings = {
          validationEnabled: true,
          minDpi: 300,
          maxDpi: undefined,
          allowedColorspaces: ['CMYK'],
          requiredBleedMm: 3,
          requireBleed: true,
          requireCropMarks: false,
          requireRegistrationMarks: false,
          requireColorBars: false,
          requireEmbeddedFonts: true,
          allowOutlinedFonts: true,
          maxFileSizeMb: 100,
          allowedFormats: ['pdf', 'ai', 'eps', 'tiff', 'jpg', 'png'],
          aspectRatioTolerance: 5,
        };
      }

      // If validation disabled, return approved
      if (!settings.validationEnabled) {
        return {
          status: 'approved' as const,
          isValid: true,
          analysis: {
            filename: input.filename,
            format: path.extname(input.filename).replace('.', '').toLowerCase(),
            fileSizeMb: input.fileSizeMb,
          },
          warnings: [],
          errors: [],
        };
      }

      const warnings: ValidationWarning[] = [];
      const errors: ValidationWarning[] = [];
      const format = path.extname(input.filename).replace('.', '').toLowerCase();

      // 1. Check format
      if (!settings.allowedFormats.map(f => f.toLowerCase()).includes(format)) {
        errors.push({
          type: 'format',
          severity: 'error',
          message: 'פורמט קובץ לא נתמך',
          details: `הפורמט ${format.toUpperCase()} אינו מותר`,
          currentValue: format.toUpperCase(),
          requiredValue: settings.allowedFormats.join(', ').toUpperCase(),
        });
      }

      // 2. Check file size
      if (input.fileSizeMb > settings.maxFileSizeMb) {
        errors.push({
          type: 'filesize',
          severity: 'error',
          message: 'קובץ גדול מדי',
          details: `גודל הקובץ ${input.fileSizeMb.toFixed(1)}MB חורג מהמקסימום`,
          currentValue: `${input.fileSizeMb.toFixed(1)}MB`,
          requiredValue: `עד ${settings.maxFileSizeMb}MB`,
        });
      }

      // 3. Check DPI (if dimensions provided)
      let calculatedDpi: number | undefined;
      if (input.widthPx && input.heightPx && input.targetWidthMm && input.targetHeightMm) {
        const dpiResult = calculateRealDpi(input.widthPx, input.heightPx, input.targetWidthMm, input.targetHeightMm);
        calculatedDpi = dpiResult.avgDpi;

        if (calculatedDpi < settings.minDpi) {
          errors.push({
            type: 'dpi',
            severity: 'error',
            message: 'רזולוציה נמוכה מדי',
            details: `הרזולוציה האמיתית ${calculatedDpi} DPI נמוכה מהמינימום הנדרש`,
            currentValue: `${calculatedDpi} DPI`,
            requiredValue: `לפחות ${settings.minDpi} DPI`,
          });
        }
      }

      // 4. Check aspect ratio
      if (input.widthPx && input.heightPx && input.targetWidthMm && input.targetHeightMm) {
        const aspectResult = checkAspectRatio(
          input.widthPx, input.heightPx,
          input.targetWidthMm, input.targetHeightMm,
          settings.aspectRatioTolerance
        );

        if (!aspectResult.isCompatible) {
          errors.push({
            type: 'aspectratio',
            severity: 'error',
            message: 'פרופורציה לא תואמת',
            details: `יחס הקובץ (${aspectResult.fileRatio}) שונה מיחס ההדפסה (${aspectResult.targetRatio}) בסטייה של ${aspectResult.deviationPercent}%`,
            currentValue: `יחס ${aspectResult.fileRatio}`,
            requiredValue: `יחס ${aspectResult.targetRatio} (±${settings.aspectRatioTolerance}%)`,
          });
        }
      }

      // 5. Check colorspace
      if (input.colorspace) {
        const colorUpper = input.colorspace.toUpperCase();
        if (!settings.allowedColorspaces.map(c => c.toUpperCase()).includes(colorUpper)) {
          warnings.push({
            type: 'colorspace',
            severity: 'warning',
            message: 'מרחב צבע לא מומלץ',
            details: `הקובץ במרחב צבע ${input.colorspace}, מומלץ ${settings.allowedColorspaces.join('/')}`,
            currentValue: input.colorspace,
            requiredValue: settings.allowedColorspaces.join(', '),
          });
        }
      }

      // 6. Check bleed
      if (settings.requireBleed && input.hasBleed === false) {
        errors.push({
          type: 'bleed',
          severity: 'error',
          message: 'חסר בליד (שפה)',
          details: `הקובץ חייב לכלול בליד של לפחות ${settings.requiredBleedMm}mm`,
          currentValue: 'ללא בליד',
          requiredValue: `${settings.requiredBleedMm}mm`,
        });
      }

      // 7. Check crop marks
      if (settings.requireCropMarks && input.hasCropMarks === false) {
        errors.push({
          type: 'cropmarks',
          severity: 'error',
          message: 'חסרים סימני חיתוך',
          details: 'הקובץ חייב לכלול סימני חיתוך (Crop Marks)',
          currentValue: 'ללא סימני חיתוך',
          requiredValue: 'נדרשים סימני חיתוך',
        });
      }

      // 8. Check registration marks
      if (settings.requireRegistrationMarks && input.hasRegistrationMarks === false) {
        errors.push({
          type: 'registrationmarks',
          severity: 'error',
          message: 'חסרים סימני רישום',
          details: 'הקובץ חייב לכלול סימני רישום (Registration Marks)',
          currentValue: 'ללא סימני רישום',
          requiredValue: 'נדרשים סימני רישום',
        });
      }

      // 9. Check fonts
      if (settings.requireEmbeddedFonts && input.fontsEmbedded === false) {
        errors.push({
          type: 'fonts',
          severity: 'error',
          message: 'בעיית פונטים',
          details: 'הפונטים בקובץ אינם מוטמעים',
          currentValue: 'פונטים לא מוטמעים',
          requiredValue: 'פונטים מוטמעים או מומרים לקווים',
        });
      }

      // Determine status
      let status: 'approved' | 'warning' | 'error';
      if (errors.length > 0) {
        status = 'error';
      } else if (warnings.length > 0) {
        status = 'warning';
      } else {
        status = 'approved';
      }

      return {
        status,
        isValid: errors.length === 0,
        analysis: {
          filename: input.filename,
          format,
          fileSizeMb: input.fileSizeMb,
          widthPx: input.widthPx,
          heightPx: input.heightPx,
          colorspace: input.colorspace,
          hasBleed: input.hasBleed,
          hasCropMarks: input.hasCropMarks,
        },
        warnings,
        errors,
        calculatedDpi,
      };
    }),
});
