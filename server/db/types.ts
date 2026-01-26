/**
 * Shared Types Module
 * 
 * Common TypeScript interfaces and types used across all database modules.
 * Centralizes type definitions to avoid duplication and ensure consistency.
 */

// ==================== USER & AUTH TYPES ====================

export type UserRole = 'admin' | 'employee' | 'customer' | 'supplier' | 'courier';
export type UserStatus = 'pending_approval' | 'active' | 'rejected' | 'deactivated';

export interface UserPermissions {
  canViewDashboard?: boolean;
  canManageQuotes?: boolean;
  canViewCustomers?: boolean;
  canEditCustomers?: boolean;
  canViewSuppliers?: boolean;
  canEditSuppliers?: boolean;
  canViewProducts?: boolean;
  canEditProducts?: boolean;
  canViewAnalytics?: boolean;
  canManageSettings?: boolean;
}

// ==================== QUOTE TYPES ====================

export type QuoteStatus = 
  | 'draft' 
  | 'sent' 
  | 'approved' 
  | 'rejected' 
  | 'superseded' 
  | 'in_production' 
  | 'ready' 
  | 'delivered';

export interface CreateQuoteRequest {
  customerId: number;
  items: {
    sizeQuantityId: number;
    quantity: number;
  }[];
}

export interface UpdateQuoteRequest {
  quoteId: number;
  employeeId: number;
  items?: {
    sizeQuantityId: number;
    quantity: number;
    priceAtTimeOfQuote: number;
    isUpsell?: boolean;
    supplierId?: number;
    supplierCost?: number;
    deliveryDays?: number;
  }[];
  finalValue?: number;
}

export interface ReviseQuoteRequest {
  quoteId: number;
  employeeId: number;
}

// ==================== PRODUCT TYPES ====================

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateProductInput {
  id: number;
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface CreateSizeInput {
  productId: number;
  name: string;
  dimensions?: string;
  basePrice?: string;
  displayOrder?: number;
}

export interface UpdateSizeInput {
  id: number;
  name?: string;
  dimensions?: string;
  basePrice?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateSizeQuantityInput {
  sizeId: number;
  quantity: number;
  price: string;
  displayOrder?: number;
}

export interface UpdateSizeQuantityInput {
  id: number;
  quantity?: number;
  price?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ==================== CUSTOMER TYPES ====================

export interface CustomerFilters {
  role?: 'customer' | 'supplier' | 'courier';
  status?: UserStatus;
  search?: string;
}

// ==================== SUPPLIER TYPES ====================

export interface SupplierWeights {
  price: number;
  rating: number;
  deliveryTime: number;
  reliability: number;
}

export const DEFAULT_SUPPLIER_WEIGHTS: SupplierWeights = {
  price: 40,
  rating: 30,
  deliveryTime: 20,
  reliability: 10
};

// ==================== FILE VALIDATION TYPES ====================

export interface FileValidationResult {
  isValid: boolean;
  warnings: FileWarning[];
  errors: FileWarning[];
}

export interface FileWarning {
  type: 'dpi' | 'colorspace' | 'bleed' | 'format' | 'filesize';
  severity: 'warning' | 'error';
  message: string;
  details?: string;
  currentValue?: string;
  requiredValue?: string;
}

// ==================== SIGNUP REQUEST TYPES ====================

export interface SignupRequestFile {
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  path: string;
}

// ==================== EMAIL SETTINGS ====================

export type EmailOnStatusChange = 'ask' | 'auto' | 'never';

// ==================== DEFAULT PERMISSIONS ====================

export const DEFAULT_PERMISSIONS = {
  employee: {
    canViewDashboard: true,
    canManageQuotes: true,
    canViewCustomers: true,
    canEditCustomers: false,
    canViewSuppliers: true,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
  admin: {
    canViewDashboard: true,
    canManageQuotes: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  supplier: {},
  courier: {},
  customer: {},
};
