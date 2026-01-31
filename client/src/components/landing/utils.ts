/**
 * Landing Page Utilities
 * Shared utility functions for landing page components
 */

import { toast } from "sonner";
import type { ValidationIssue, Category } from "./types";

// ============================================================================
// Image Utilities
// ============================================================================

/**
 * Get image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
};

// ============================================================================
// Dimension Parsing
// ============================================================================

/**
 * Parse dimensions string - supports both cm (e.g., "80x200") and mm (e.g., "800x2000")
 * If both numbers are > 500, assume mm; otherwise assume cm
 */
export const parseDimensions = (dimensions?: string): { widthMm: number; heightMm: number } | null => {
  if (!dimensions) return null;
  const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  
  let width = parseFloat(match[1]);
  let height = parseFloat(match[2]);
  
  // Auto-detect: if both values are large (>500), assume already in mm
  // Otherwise assume cm and convert to mm
  const isAlreadyMm = width > 500 || height > 500;
  
  return {
    widthMm: isAlreadyMm ? width : width * 10,
    heightMm: isAlreadyMm ? height : height * 10,
  };
};

// ============================================================================
// File Validation
// ============================================================================

/**
 * Validate file against product requirements using category settings
 */
export const validateFileForProduct = async (
  file: File, 
  imageDimensions: { width: number; height: number } | null,
  sizeDimensions?: string,
  categoryValidation?: Category
): Promise<{ errors: ValidationIssue[]; warnings: ValidationIssue[] }> => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Get validation settings from category or use defaults
  const minDpi = categoryValidation?.minDpi ?? 150;
  const maxFileSizeMb = categoryValidation?.maxFileSizeMb ?? 100;
  const allowedFormats = categoryValidation?.allowedFormats ?? ['pdf', 'ai', 'eps', 'tiff', 'jpg', 'png'];
  const aspectRatioTolerance = parseFloat(categoryValidation?.aspectRatioTolerance ?? '10');
  const validationEnabled = categoryValidation?.validationEnabled !== false;

  // If validation is disabled for this category, skip all checks
  if (!validationEnabled) {
    return { errors, warnings };
  }

  // Check file format
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const formatAllowed = allowedFormats.some(fmt => 
    extension === fmt.toLowerCase() || 
    (fmt === 'jpg' && extension === 'jpeg') ||
    (fmt === 'tiff' && extension === 'tif')
  );
  
  if (!formatAllowed) {
    errors.push({
      type: 'format',
      severity: 'error',
      message: 'פורמט קובץ לא נתמך',
      details: `הפורמט ${extension.toUpperCase()} אינו מותר. פורמטים מותרים: ${allowedFormats.join(', ').toUpperCase()}`,
    });
    return { errors, warnings };
  }

  // Check file size
  const fileSizeMb = file.size / 1024 / 1024;
  if (fileSizeMb > maxFileSizeMb) {
    errors.push({
      type: 'filesize',
      severity: 'error',
      message: 'קובץ גדול מדי',
      details: `גודל הקובץ ${fileSizeMb.toFixed(1)}MB חורג מהמקסימום (${maxFileSizeMb}MB)`,
    });
    return { errors, warnings };
  }

  // If we have image dimensions and target dimensions, check DPI
  if (imageDimensions && sizeDimensions) {
    const targetDims = parseDimensions(sizeDimensions);
    if (targetDims) {
      // Calculate DPI
      const dpiWidth = (imageDimensions.width / targetDims.widthMm) * 25.4;
      const dpiHeight = (imageDimensions.height / targetDims.heightMm) * 25.4;
      const avgDpi = Math.round((dpiWidth + dpiHeight) / 2);

      // Check DPI against category settings
      const criticalMinDpi = Math.floor(minDpi * 0.5); // 50% of minDpi is critical error
      
      if (avgDpi < criticalMinDpi) {
        errors.push({
          type: 'dpi',
          severity: 'error',
          message: 'רזולוציה נמוכה מדי',
          details: `הרזולוציה ${avgDpi} DPI נמוכה מדי להדפסה איכותית (מינימום נדרש ${minDpi} DPI)`,
        });
      } else if (avgDpi < minDpi) {
        warnings.push({
          type: 'dpi',
          severity: 'warning',
          message: 'רזולוציה נמוכה',
          details: `הרזולוציה ${avgDpi} DPI נמוכה מהמומלץ (${minDpi} DPI) - עלול להשפיע על האיכות`,
        });
      }

      // Check aspect ratio
      const fileRatio = imageDimensions.width / imageDimensions.height;
      const targetRatio = targetDims.widthMm / targetDims.heightMm;
      const ratioDiff = Math.abs(fileRatio - targetRatio) / targetRatio * 100;

      // Aspect ratio validation:
      // - Less than 0.1% difference: OK, no message
      // - 0.1% to tolerance: Warning (can submit)
      // - Above tolerance: Error (cannot submit without graphic design)
      if (ratioDiff > aspectRatioTolerance) {
        // Above tolerance = ERROR - cannot submit
        errors.push({
          type: 'aspectratio',
          severity: 'error',
          message: 'פרופורציה שונה מדי',
          details: `סטיית הפרופורציה (${ratioDiff.toFixed(1)}%) חורגת מהמותר (${aspectRatioTolerance}%) - לא ניתן להתאים`,
        });
      } else if (ratioDiff >= 0.1) {
        // Within tolerance but noticeable = WARNING - can submit
        warnings.push({
          type: 'aspectratio',
          severity: 'warning',
          message: 'פרופורציה שונה',
          details: `סטייה קלה בפרופורציה (${ratioDiff.toFixed(1)}%) - הספק יתאים את הקובץ`,
        });
      }
      // Less than 0.1% = perfect, no message needed
    }
  }

  return { errors, warnings };
};

// ============================================================================
// S3 Upload
// ============================================================================

/**
 * Upload file to S3
 */
export const uploadFileToS3 = async (file: File): Promise<{ key: string; url: string } | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', 'quote');

    const response = await fetch('/api/s3/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return { key: result.key, url: result.url };
  } catch (error) {
    toast.error(`שגיאה בהעלאת ${file.name}`);
    return null;
  }
};

// ============================================================================
// Basic File Validation
// ============================================================================

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Basic file validation (format and size)
 */
export const validateFileBasic = (file: File): { valid: boolean; error?: string } => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!ALLOWED_EXT.includes(extension)) {
    return { valid: false, error: `סוג קובץ לא מורשה: ${extension}` };
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'הקובץ גדול מדי (מקסימום 100MB)' };
  }
  
  return { valid: true };
};
