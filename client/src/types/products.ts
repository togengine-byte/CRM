// Product Types

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number | null;
  isActive?: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SizeQuantity {
  id: number;
  sizeId: number;
  quantity: number;
  price: string;
  displayOrder: number | null;
  isActive: boolean | null;
  createdAt?: Date | null;
}

export interface ProductSize {
  id: number;
  productId: number;
  name: string;
  dimensions: string | null;
  basePrice: string;
  graphicDesignPrice: string | null; // מחיר עיצוב גרפי לגודל זה
  displayOrder: number | null;
  isActive: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  quantities?: SizeQuantity[];
}

export interface ProductAddon {
  id: number;
  productId: number | null;
  categoryId: number | null;
  name: string;
  description: string | null;
  priceType: string;
  price: string;
  isActive: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  imageUrl: string | null;
  allowCustomQuantity: boolean | null;
  isActive: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
  sizes: ProductSize[];
  addons?: ProductAddon[];
  quantities?: SizeQuantity[];
}

// Form Types
export interface ProductFormData {
  name: string;
  description: string;
  categoryId: number | null;
  allowCustomQuantity: boolean;
}

export interface SizeFormData {
  name: string;
  dimensions: string;
  graphicDesignPrice: string; // מחיר עיצוב גרפי
}

export interface QuantityFormData {
  quantity: string;
  price: string;
}

export interface AddonFormData {
  name: string;
  description: string;
  priceType: "fixed" | "percentage" | "per_unit";
  price: string;
}
