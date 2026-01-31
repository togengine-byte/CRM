/**
 * Product Selector Component
 * Handles product, size, and quantity selection
 */

import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import type { Category, Product, Size, Quantity } from "./types";

interface ProductSelectorProps {
  categories: Category[] | undefined;
  products: Product[] | undefined;
  sizes: Size[] | undefined;
  quantities: Quantity[] | undefined;
  selectedCategoryId: number | null;
  selectedProductId: number | null;
  selectedSizeId: number | null;
  selectedQuantityId: number | null;
  onCategoryChange: (id: number | null) => void;
  onProductChange: (id: number | null) => void;
  onSizeChange: (id: number | null) => void;
  onQuantityChange: (id: number | null) => void;
  onAddProduct: () => void;
}

export function ProductSelector({
  categories,
  products,
  sizes,
  quantities,
  selectedCategoryId,
  selectedProductId,
  selectedSizeId,
  selectedQuantityId,
  onCategoryChange,
  onProductChange,
  onSizeChange,
  onQuantityChange,
  onAddProduct,
}: ProductSelectorProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" />
        הוספת מוצר
        <span className="text-xs text-slate-400 font-normal">(אופציונלי)</span>
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Category */}
        <select
          value={selectedCategoryId || ""}
          onChange={(e) => {
            onCategoryChange(e.target.value ? parseInt(e.target.value) : null);
            onProductChange(null);
            onSizeChange(null);
            onQuantityChange(null);
          }}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">קטגוריה</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Product */}
        <select
          value={selectedProductId || ""}
          onChange={(e) => {
            onProductChange(e.target.value ? parseInt(e.target.value) : null);
            onSizeChange(null);
            onQuantityChange(null);
          }}
          disabled={!selectedCategoryId}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">מוצר</option>
          {products?.map((prod) => (
            <option key={prod.id} value={prod.id}>{prod.name}</option>
          ))}
        </select>

        {/* Size */}
        <select
          value={selectedSizeId || ""}
          onChange={(e) => {
            onSizeChange(e.target.value ? parseInt(e.target.value) : null);
            onQuantityChange(null);
          }}
          disabled={!selectedProductId}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">גודל</option>
          {sizes?.map((size) => (
            <option key={size.id} value={size.id}>
              {size.name} {size.dimensions && `(${size.dimensions})`}
            </option>
          ))}
        </select>

        {/* Quantity */}
        <select
          value={selectedQuantityId || ""}
          onChange={(e) => onQuantityChange(e.target.value ? parseInt(e.target.value) : null)}
          disabled={!selectedSizeId}
          className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">כמות</option>
          {quantities?.map((qty) => (
            <option key={qty.id} value={qty.id}>
              {qty.quantity} יח' - ₪{parseFloat(qty.price).toLocaleString()}
            </option>
          ))}
        </select>

        {/* Add Button */}
        <Button 
          type="button"
          onClick={onAddProduct}
          disabled={!selectedQuantityId}
          variant="outline"
          size="sm"
          className="h-9"
        >
          <Plus className="h-4 w-4 ml-1" />
          הוסף
        </Button>
      </div>
    </div>
  );
}
