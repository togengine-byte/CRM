interface Product {
  id: number;
  name: string;
  sizes?: {
    id: number;
    name: string;
    quantities?: {
      id: number;
      quantity: number;
    }[];
  }[];
  quantities?: {
    id: number;
    sizeId: number;
    quantity: number;
  }[];
}

/**
 * Gets the full name of a product by its sizeQuantityId
 * Returns format: "Product Name - Size Name (X יח')"
 */
export function getSizeQuantityName(sizeQuantityId: number, products: Product[]): string {
  for (const product of products) {
    for (const size of product.sizes || []) {
      const quantities = size.quantities || product.quantities?.filter(q => q.sizeId === size.id) || [];
      const sq = quantities.find(q => q.id === sizeQuantityId);
      if (sq) {
        return `${product.name} - ${size.name} (${sq.quantity} יח')`;
      }
    }
  }
  return `מוצר #${sizeQuantityId}`;
}

/**
 * Formats a price in Israeli Shekels
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return "-";
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return "-";
  return `₪${numPrice.toLocaleString()}`;
}

/**
 * Calculates profit from supplier cost and customer price
 */
export function calculateProfit(supplierCost: number, customerPrice: number): {
  amount: number;
  percentage: number;
} {
  const amount = customerPrice - supplierCost;
  const percentage = supplierCost > 0 ? ((amount / supplierCost) * 100) : 0;
  return { amount, percentage };
}

/**
 * Rounds a price to the nearest whole number
 */
export function roundPrice(price: number): number {
  return Math.round(price);
}
