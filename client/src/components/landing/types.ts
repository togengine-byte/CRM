/**
 * Landing Page Types
 * Shared type definitions for all landing page components
 */

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

// ============================================================================
// File Types
// ============================================================================

export interface ProductFile {
  file: File;
  id: string;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  s3Key?: string;
  s3Url?: string;
  validationErrors?: ValidationIssue[];
  validationWarnings?: ValidationIssue[];
  imageDimensions?: { width: number; height: number };
  needsGraphicDesign?: boolean;
}

// ============================================================================
// Product Catalog Types
// ============================================================================

export interface Category {
  id: number;
  name: string;
  // Validation settings
  validationEnabled?: boolean;
  minDpi?: number;
  maxDpi?: number | null;
  allowedColorspaces?: string[];
  requiredBleedMm?: string;
  requireBleed?: boolean;
  maxFileSizeMb?: number;
  allowedFormats?: string[];
  aspectRatioTolerance?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
}

export interface Size {
  id: number;
  name: string;
  dimensions?: string;
  graphicDesignPrice?: string;
}

export interface Quantity {
  id: number;
  quantity: number;
  price: string;
}

export interface Addon {
  id: number;
  name: string;
  description?: string | null;
  priceType: string; // 'fixed' or 'percentage'
  price: string;
  categoryId?: number | null;
  productId?: number | null;
  isActive?: boolean;
}

// ============================================================================
// Selected Product Types
// ============================================================================

export interface SelectedAddon {
  id: number;
  name: string;
  priceType: string;
  price: number; // parsed price
}

export interface SelectedProduct {
  id: string; // unique id for this selection
  productId: number;
  productName: string;
  categoryId: number;
  categoryValidation?: Category; // validation settings from category
  sizeId: number;
  sizeName: string;
  sizeDimensions?: string;
  quantityId: number;
  sizeQuantityId: number; // The actual ID to send to API
  quantity: number;
  price: number;
  graphicDesignPrice: number;
  file?: ProductFile;
  needsGraphicDesign?: boolean;
  addons?: SelectedAddon[]; // selected addons for this product
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  // Optional fields
  address?: string;
  billingEmail?: string;
  taxId?: string; // ח.פ / עוסק מורשה
  contactPerson?: string;
  contactPhone?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// ============================================================================
// Constants
// ============================================================================

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
