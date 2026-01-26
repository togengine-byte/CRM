/**
 * Validation Module
 * 
 * File validation functions for print-ready files.
 */

import { FileValidationResult, FileWarning } from "./types";
import { getFileValidationSettings } from "./settings";

// ==================== FILE VALIDATION ====================

/**
 * Validate print file
 */
export async function validatePrintFile(filePath: string, fileInfo?: {
  dpi?: number;
  colorspace?: string;
  hasBleed?: boolean;
  bleedSize?: number;
  format?: string;
  fileSize?: number;
}): Promise<FileValidationResult> {
  const settings = await getFileValidationSettings();
  const warnings: FileWarning[] = [];
  const errors: FileWarning[] = [];

  // Check DPI
  if (fileInfo?.dpi !== undefined) {
    if (fileInfo.dpi < settings.minDpi) {
      errors.push({
        type: 'dpi',
        severity: 'error',
        message: `רזולוציה נמוכה מדי`,
        details: `הקובץ ברזולוציה של ${fileInfo.dpi} DPI, נדרש לפחות ${settings.minDpi} DPI`,
        currentValue: `${fileInfo.dpi} DPI`,
        requiredValue: `${settings.minDpi} DPI`,
      });
    } else if (fileInfo.dpi < settings.minDpi * 1.5) {
      warnings.push({
        type: 'dpi',
        severity: 'warning',
        message: `רזולוציה גבולית`,
        details: `הקובץ ברזולוציה של ${fileInfo.dpi} DPI, מומלץ ${settings.minDpi * 1.5} DPI לתוצאות מיטביות`,
        currentValue: `${fileInfo.dpi} DPI`,
        requiredValue: `${settings.minDpi * 1.5} DPI`,
      });
    }
  }

  // Check colorspace
  if (fileInfo?.colorspace !== undefined && settings.requiredColorspace) {
    if (fileInfo.colorspace.toUpperCase() !== settings.requiredColorspace.toUpperCase()) {
      warnings.push({
        type: 'colorspace',
        severity: 'warning',
        message: `מרחב צבע לא תואם`,
        details: `הקובץ במרחב צבע ${fileInfo.colorspace}, מומלץ ${settings.requiredColorspace} להדפסה`,
        currentValue: fileInfo.colorspace,
        requiredValue: settings.requiredColorspace,
      });
    }
  }

  // Check bleed
  if (settings.requireBleed && fileInfo?.hasBleed !== undefined) {
    if (!fileInfo.hasBleed) {
      errors.push({
        type: 'bleed',
        severity: 'error',
        message: `חסר Bleed (שפה)`,
        details: `הקובץ חייב לכלול שפה (bleed) של לפחות ${settings.bleedSizeMm}mm`,
        currentValue: 'ללא שפה',
        requiredValue: `${settings.bleedSizeMm}mm`,
      });
    } else if (fileInfo.bleedSize !== undefined && fileInfo.bleedSize < settings.bleedSizeMm) {
      warnings.push({
        type: 'bleed',
        severity: 'warning',
        message: `שפה (Bleed) קטנה`,
        details: `השפה בקובץ היא ${fileInfo.bleedSize}mm, מומלץ ${settings.bleedSizeMm}mm`,
        currentValue: `${fileInfo.bleedSize}mm`,
        requiredValue: `${settings.bleedSizeMm}mm`,
      });
    }
  }

  // Check format
  if (fileInfo?.format !== undefined && settings.allowedFormats) {
    const formatLower = fileInfo.format.toLowerCase();
    if (!settings.allowedFormats.includes(formatLower)) {
      errors.push({
        type: 'format',
        severity: 'error',
        message: `פורמט קובץ לא נתמך`,
        details: `פורמט ${fileInfo.format} לא נתמך. פורמטים מותרים: ${settings.allowedFormats.join(', ')}`,
        currentValue: fileInfo.format,
        requiredValue: settings.allowedFormats.join(', '),
      });
    }
  }

  // Check file size
  if (fileInfo?.fileSize !== undefined && settings.maxFileSizeMb) {
    const fileSizeMb = fileInfo.fileSize / (1024 * 1024);
    if (fileSizeMb > settings.maxFileSizeMb) {
      errors.push({
        type: 'filesize',
        severity: 'error',
        message: `קובץ גדול מדי`,
        details: `גודל הקובץ ${fileSizeMb.toFixed(1)}MB חורג מהמקסימום המותר ${settings.maxFileSizeMb}MB`,
        currentValue: `${fileSizeMb.toFixed(1)}MB`,
        requiredValue: `${settings.maxFileSizeMb}MB`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get validation requirements
 */
export async function getValidationRequirements() {
  const settings = await getFileValidationSettings();
  
  return {
    dpi: {
      minimum: settings.minDpi,
      recommended: settings.minDpi * 1.5,
    },
    colorspace: {
      required: settings.requiredColorspace,
      alternatives: ['RGB', 'CMYK'],
    },
    bleed: {
      required: settings.requireBleed,
      minimumMm: settings.bleedSizeMm,
    },
    formats: {
      allowed: settings.allowedFormats,
      preferred: ['pdf', 'ai'],
    },
    fileSize: {
      maximumMb: settings.maxFileSizeMb,
    },
  };
}

/**
 * Validate multiple files
 */
export async function validateMultipleFiles(files: Array<{
  path: string;
  info?: {
    dpi?: number;
    colorspace?: string;
    hasBleed?: boolean;
    bleedSize?: number;
    format?: string;
    fileSize?: number;
  };
}>): Promise<{
  allValid: boolean;
  results: Array<{
    path: string;
    result: FileValidationResult;
  }>;
  summary: {
    totalFiles: number;
    validFiles: number;
    filesWithWarnings: number;
    filesWithErrors: number;
  };
}> {
  const results = await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      result: await validatePrintFile(file.path, file.info),
    }))
  );

  const validFiles = results.filter(r => r.result.isValid).length;
  const filesWithWarnings = results.filter(r => r.result.warnings.length > 0).length;
  const filesWithErrors = results.filter(r => r.result.errors.length > 0).length;

  return {
    allValid: filesWithErrors === 0,
    results,
    summary: {
      totalFiles: files.length,
      validFiles,
      filesWithWarnings,
      filesWithErrors,
    },
  };
}


// ==================== VALIDATION PROFILES ====================

import { validationProfiles } from "../../drizzle/schema";

function safeParseJsonArray(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get all validation profiles
 */
export async function getValidationProfiles() {
  const db = await getDb();
  if (!db) return [];
  
  const profiles = await db.select().from(validationProfiles).orderBy(desc(validationProfiles.createdAt));
  return profiles.map(p => ({
    ...p,
    allowedColorspaces: safeParseJsonArray(p.allowedColorspaces),
    allowedFormats: safeParseJsonArray(p.allowedFormats),
  }));
}

/**
 * Get validation profile by ID
 */
export async function getValidationProfileById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(validationProfiles).where(eq(validationProfiles.id, id)).limit(1);
  if (!result[0]) return null;
  
  const p = result[0];
  return {
    ...p,
    allowedColorspaces: safeParseJsonArray(p.allowedColorspaces),
    allowedFormats: safeParseJsonArray(p.allowedFormats),
  };
}

/**
 * Create validation profile
 */
export async function createValidationProfile(data: {
  name: string;
  description?: string;
  minDpi: number;
  maxDpi?: number;
  allowedColorspaces: string[];
  requiredBleedMm: number;
  maxFileSizeMb: number;
  allowedFormats: string[];
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  if (data.isDefault) {
    await db.update(validationProfiles).set({ isDefault: false }).where(eq(validationProfiles.isDefault, true));
  }
  
  const result = await db.insert(validationProfiles).values({
    name: data.name,
    description: data.description || null,
    minDpi: data.minDpi,
    maxDpi: data.maxDpi || null,
    allowedColorspaces: JSON.stringify(data.allowedColorspaces),
    requiredBleedMm: data.requiredBleedMm,
    maxFileSizeMb: data.maxFileSizeMb,
    allowedFormats: JSON.stringify(data.allowedFormats),
    isDefault: data.isDefault || false,
  }).returning({ id: validationProfiles.id });
  
  return { id: result[0]?.id };
}

/**
 * Update validation profile
 */
export async function updateValidationProfile(id: number, data: {
  name?: string;
  description?: string;
  minDpi?: number;
  maxDpi?: number;
  allowedColorspaces?: string[];
  requiredBleedMm?: number;
  maxFileSizeMb?: number;
  allowedFormats?: string[];
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  if (data.isDefault) {
    await db.update(validationProfiles).set({ isDefault: false }).where(eq(validationProfiles.isDefault, true));
  }
  
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.minDpi !== undefined) updateData.minDpi = data.minDpi;
  if (data.maxDpi !== undefined) updateData.maxDpi = data.maxDpi;
  if (data.allowedColorspaces !== undefined) updateData.allowedColorspaces = JSON.stringify(data.allowedColorspaces);
  if (data.requiredBleedMm !== undefined) updateData.requiredBleedMm = data.requiredBleedMm;
  if (data.maxFileSizeMb !== undefined) updateData.maxFileSizeMb = data.maxFileSizeMb;
  if (data.allowedFormats !== undefined) updateData.allowedFormats = JSON.stringify(data.allowedFormats);
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
  
  await db.update(validationProfiles).set(updateData).where(eq(validationProfiles.id, id));
  
  return { success: true };
}

/**
 * Delete validation profile
 */
export async function deleteValidationProfile(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.delete(validationProfiles).where(eq(validationProfiles.id, id));
  
  return { success: true };
}


import { quoteFileWarnings } from "../../drizzle/schema";

/**
 * Get default validation profile
 */
export async function getDefaultValidationProfile() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(validationProfiles).where(eq(validationProfiles.isDefault, true)).limit(1);
  return result[0] || null;
}

/**
 * Validate file against profile
 */
export async function validateFile(
  fileMetadata: {
    filename: string;
    fileSizeMb: number;
    format: string;
    dpi?: number;
    colorspace?: string;
    hasBleed?: boolean;
    bleedMm?: number;
    width?: number;
    height?: number;
  },
  profileId?: number
): Promise<FileValidationResult> {
  let profile;
  if (profileId) {
    profile = await getValidationProfileById(profileId);
  } else {
    profile = await getDefaultValidationProfile();
  }
  
  if (!profile) {
    return { isValid: true, warnings: [], errors: [] };
  }
  
  const warnings: FileWarning[] = [];
  const errors: FileWarning[] = [];
  
  const allowedColorspaces = safeParseJsonArray(profile.allowedColorspaces);
  const allowedFormats = safeParseJsonArray(profile.allowedFormats);
  
  // Check file format
  const fileFormat = fileMetadata.format.toLowerCase();
  if (allowedFormats.length > 0 && !allowedFormats.includes(fileFormat)) {
    errors.push({
      type: 'format',
      severity: 'error',
      message: 'פורמט קובץ לא נתמך',
      details: `הפורמט ${fileFormat} אינו מותר להדפסה`,
      currentValue: fileFormat,
      requiredValue: allowedFormats.join(', '),
    });
  }
  
  // Check file size
  if (fileMetadata.fileSizeMb > profile.maxFileSizeMb) {
    errors.push({
      type: 'filesize',
      severity: 'error',
      message: 'קובץ גדול מדי',
      details: `גודל הקובץ ${fileMetadata.fileSizeMb.toFixed(1)}MB חורג מהמקסימום המותר`,
      currentValue: `${fileMetadata.fileSizeMb.toFixed(1)}MB`,
      requiredValue: `עד ${profile.maxFileSizeMb}MB`,
    });
  }
  
  // Check DPI
  if (fileMetadata.dpi !== undefined) {
    if (fileMetadata.dpi < profile.minDpi) {
      errors.push({
        type: 'dpi',
        severity: 'error',
        message: 'רזולוציה נמוכה מדי',
        details: `רזולוציית הקובץ ${fileMetadata.dpi} DPI נמוכה מהמינימום הנדרש`,
        currentValue: `${fileMetadata.dpi} DPI`,
        requiredValue: `לפחות ${profile.minDpi} DPI`,
      });
    } else if (profile.maxDpi && fileMetadata.dpi > profile.maxDpi) {
      warnings.push({
        type: 'dpi',
        severity: 'warning',
        message: 'רזולוציה גבוהה מהנדרש',
        details: `רזולוציית הקובץ ${fileMetadata.dpi} DPI גבוהה מהמקסימום המומלץ`,
        currentValue: `${fileMetadata.dpi} DPI`,
        requiredValue: `עד ${profile.maxDpi} DPI`,
      });
    }
  }
  
  // Check colorspace
  if (fileMetadata.colorspace && allowedColorspaces.length > 0) {
    if (!allowedColorspaces.includes(fileMetadata.colorspace.toUpperCase())) {
      warnings.push({
        type: 'colorspace',
        severity: 'warning',
        message: 'מרחב צבע לא מומלץ',
        details: `מרחב הצבע ${fileMetadata.colorspace} אינו מומלץ להדפסה`,
        currentValue: fileMetadata.colorspace,
        requiredValue: allowedColorspaces.join(', '),
      });
    }
  }
  
  // Check bleed
  if (profile.requiredBleedMm > 0) {
    if (!fileMetadata.hasBleed) {
      errors.push({
        type: 'bleed',
        severity: 'error',
        message: 'חסר שפה (Bleed)',
        details: `הקובץ חייב לכלול שפה של לפחות ${profile.requiredBleedMm}mm`,
        currentValue: 'ללא שפה',
        requiredValue: `${profile.requiredBleedMm}mm`,
      });
    } else if (fileMetadata.bleedMm !== undefined && fileMetadata.bleedMm < profile.requiredBleedMm) {
      warnings.push({
        type: 'bleed',
        severity: 'warning',
        message: 'שפה קטנה מהנדרש',
        details: `השפה בקובץ ${fileMetadata.bleedMm}mm קטנה מהמינימום המומלץ`,
        currentValue: `${fileMetadata.bleedMm}mm`,
        requiredValue: `${profile.requiredBleedMm}mm`,
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// ==================== FILE WARNINGS ====================

/**
 * Save file warnings
 */
export async function saveFileWarnings(
  quoteId: number,
  attachmentId: number,
  warnings: FileWarning[]
) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.delete(quoteFileWarnings).where(eq(quoteFileWarnings.attachmentId, attachmentId));
  
  if (warnings.length > 0) {
    await db.insert(quoteFileWarnings).values(
      warnings.map(w => ({
        quoteId,
        attachmentId,
        warningType: w.type,
        severity: w.severity,
        message: w.message,
        details: w.details || null,
        currentValue: w.currentValue || null,
        requiredValue: w.requiredValue || null,
        isAcknowledged: false,
      }))
    );
  }
  
  return { success: true };
}

/**
 * Get file warnings for quote
 */
export async function getFileWarnings(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(quoteFileWarnings)
    .where(eq(quoteFileWarnings.quoteId, quoteId))
    .orderBy(desc(quoteFileWarnings.createdAt));
}

/**
 * Get file warnings by attachment
 */
export async function getFileWarningsByAttachment(attachmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(quoteFileWarnings)
    .where(eq(quoteFileWarnings.attachmentId, attachmentId))
    .orderBy(desc(quoteFileWarnings.createdAt));
}

/**
 * Acknowledge warning
 */
export async function acknowledgeWarning(warningId: number, acknowledgedBy: number) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.update(quoteFileWarnings)
    .set({ 
      isAcknowledged: true, 
      acknowledgedAt: new Date(),
      acknowledgedBy 
    })
    .where(eq(quoteFileWarnings.id, warningId));
  
  return { success: true };
}

/**
 * Acknowledge all warnings for quote
 */
export async function acknowledgeAllWarnings(quoteId: number, acknowledgedBy: number) {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db.update(quoteFileWarnings)
    .set({ 
      isAcknowledged: true, 
      acknowledgedAt: new Date(),
      acknowledgedBy 
    })
    .where(and(
      eq(quoteFileWarnings.quoteId, quoteId),
      eq(quoteFileWarnings.isAcknowledged, false)
    ));
  
  return { success: true };
}
