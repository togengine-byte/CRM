import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryRecommendation } from "@/types/quotes";

interface SupplierRecommendationsByCategoryProps {
  quoteId: number;
  quoteItems: { quoteItemId: number; sizeQuantityId: number; quantity: number; productName: string }[];
  quoteStatus: string;
  onSupplierSelected: () => void;
  markupPercentage?: number;
}

export function SupplierRecommendationsByCategory({ 
  quoteId,
  quoteItems,
  quoteStatus,
  onSupplierSelected,
  markupPercentage = 0,
}: SupplierRecommendationsByCategoryProps) {
  // In draft mode, clicking supplier just updates prices (no job creation)
  // After approval, clicking supplier creates jobs
  const isDraftMode = quoteStatus === 'draft';
  const canCreateJobs = quoteStatus === 'approved' || quoteStatus === 'in_production';
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);

  const { data: recommendations, isLoading } = trpc.suppliers.recommendationsByCategory.useQuery(
    { quoteItems },
    { enabled: quoteItems.length > 0 }
  );

  // Mutation for draft mode - just update prices
  const selectSupplierMutation = trpc.quotePricing.selectSupplierForPricing.useMutation({
    onSuccess: () => {
      toast.success(`ספק נבחר והמחירים עודכנו!`);
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בבחירת ספק: ${error.message}`);
    },
  });

  // Mutation for after approval - create jobs
  const assignMutation = trpc.suppliers.assignToCategory.useMutation({
    onSuccess: () => {
      toast.success(`העבודה הועברה לספק בהצלחה!`);
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בהעברה לספק: ${error.message}`);
    },
  });

  const handleSelectSupplier = (category: CategoryRecommendation, supplier: CategoryRecommendation['suppliers'][0]) => {
    setSelectedSupplier(supplier.supplierId);
    
    // Draft mode - just update prices, no job creation
    if (isDraftMode) {
      console.log('[Draft Mode] Selecting supplier for pricing:', { quoteId, supplierId: supplier.supplierId, markupPercentage });
      selectSupplierMutation.mutate({
        quoteId,
        supplierId: supplier.supplierId,
        items: supplier.canFulfill,
        markupPercentage,
      });
    } else if (canCreateJobs) {
      // After approval - create supplier jobs
      console.log('[Production Mode] Assigning supplier to category:', { quoteId, supplierId: supplier.supplierId });
      assignMutation.mutate({
        quoteId,
        supplierId: supplier.supplierId,
        items: supplier.canFulfill,
      });
    } else {
      // For sent status - show message that we can't assign yet
      toast.info('לא ניתן להעביר לספק לפני אישור הלקוח');
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-background rounded border">
        <p className="text-sm text-muted-foreground mb-2">טוען ספקים מומלצים...</p>
        <div className="space-y-2">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-3 bg-background rounded border">
        <p className="text-sm text-muted-foreground">לא נמצאו ספקים מומלצים למוצרים בהצעה</p>
      </div>
    );
  }

  const isPending = selectSupplierMutation.isPending || assignMutation.isPending;

  return (
    <div className="space-y-3">
      {(recommendations as CategoryRecommendation[]).map((category) => (
        <div key={category.categoryId} className="p-3 bg-background rounded border">
          {/* Category Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-sm">{category.categoryName}</p>
              <p className="text-xs text-muted-foreground">
                {category.items.map(i => i.productName).join(', ')}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {category.items.length} פריטים
            </Badge>
          </div>

          {/* Selected supplier indicator */}
          {selectedSupplier && category.suppliers.some(s => s.supplierId === selectedSupplier) && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  ספק נבחר: {category.suppliers.find(s => s.supplierId === selectedSupplier)?.supplierName}
                </span>
              </div>
              <span className="text-sm text-green-600">
                ₪{category.suppliers.find(s => s.supplierId === selectedSupplier)?.totalPrice.toLocaleString()}
              </span>
            </div>
          )}

          {/* Suppliers for this category - show up to 5 */}
          {category.suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין ספקים זמינים לתחום זה</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {category.suppliers.slice(0, 5).map((supplier, index) => (
                <button
                  key={supplier.supplierId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSupplier(category, supplier);
                  }}
                  disabled={isPending}
                  className={cn(
                    "flex-1 min-w-[120px] max-w-[180px] p-2 rounded border text-right transition-all",
                    !isPending && "hover:shadow-sm cursor-pointer",
                    isPending && selectedSupplier === supplier.supplierId && "opacity-70",
                    isPending && selectedSupplier !== supplier.supplierId && "opacity-50",
                    index === 0 
                      ? "bg-green-50 border-green-200 hover:border-green-300"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {isPending && selectedSupplier === supplier.supplierId && (
                    <Loader2 className="h-3 w-3 animate-spin absolute top-1 left-1" />
                  )}
                  <p className="font-medium text-sm truncate">{supplier.supplierName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">⭐ {supplier.avgRating.toFixed(1)}</span>
                    <span className="text-xs font-medium">₪{supplier.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{supplier.avgDeliveryDays} ימים</span>
                    <span className="text-xs text-muted-foreground">{supplier.reliabilityPct}% אמינות</span>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 bg-green-100 text-green-700 border-green-200">
                      מומלץ
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
