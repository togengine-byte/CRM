/**
 * Types for Quotes module
 */

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "superseded" | "in_production" | "ready";

export interface QuoteItem {
  sizeQuantityId: number;
  quantity: number;
  notes?: string;
  productName?: string;
  sizeName?: string;
}

export interface EditedPrice {
  customerPrice: number;
  isManual: boolean;
}

export interface CreateQuoteForm {
  notes: string;
  items: QuoteItem[];
  customerId: number | null;
  files: File[];
}

// Supplier recommendation types
export interface SupplierRecommendation {
  supplierId: number;
  supplierName: string;
  companyName?: string | null;
  pricePerUnit?: number;
  deliveryDays?: number;
  rating?: number;
  reliabilityScore?: number;
  totalScore?: number;
  price?: number;
  avgRating?: number;
  avgDeliveryDays?: number;
  score?: number;
}

export interface CategoryRecommendation {
  categoryId: number;
  categoryName: string;
  items: {
    quoteItemId: number;
    sizeQuantityId: number;
    productName: string;
    quantity: number;
  }[];
  suppliers: {
    supplierId: number;
    supplierName: string;
    supplierCompany: string | null;
    avgRating: number;
    totalPrice: number;
    avgDeliveryDays: number;
    reliabilityPct: number;
    totalScore: number;
    rank: number;
    canFulfill: {
      quoteItemId: number;
      sizeQuantityId: number;
      pricePerUnit: number;
      deliveryDays: number;
    }[];
  }[];
}

export interface ItemRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  suppliers: {
    supplierId: number;
    supplierName: string;
    supplierCompany: string | null;
    avgRating: number;
    pricePerUnit: number;
    deliveryDays: number;
    reliabilityPct: number;
    totalScore: number;
    rank: number;
    canFulfillOtherItems: number;
    multiItemBonus: number;
  }[];
  selectedSupplierId?: number;
}

export interface ConfirmSupplierData {
  categoryId: number;
  categoryName: string;
  supplier: CategoryRecommendation['suppliers'][0];
  items: CategoryRecommendation['items'];
}
