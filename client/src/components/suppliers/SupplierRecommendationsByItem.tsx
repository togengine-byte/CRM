import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemRecommendation } from "@/types/quotes";

interface SupplierRecommendationsByItemProps {
  quoteId: number;
  quoteItems: { quoteItemId: number; sizeQuantityId: number; quantity: number; productName: string }[];
  quoteStatus: string;
  onSupplierSelected: () => void;
  markupPercentage?: number;
}

export function SupplierRecommendationsByItem({ 
  quoteId,
  quoteItems,
  quoteStatus,
  onSupplierSelected,
  markupPercentage = 0,
}: SupplierRecommendationsByItemProps) {
  const isDraftMode = quoteStatus === 'draft';
  const canCreateJobs = quoteStatus === 'approved' || quoteStatus === 'in_production';
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<number, number>>({});

  const { data: recommendations, isLoading, refetch } = trpc.suppliers.recommendationsByItem.useQuery(
    { quoteItems },
    { enabled: quoteItems.length > 0 }
  );

  // Mutation for selecting supplier for a single item
  const selectSupplierMutation = trpc.suppliers.selectForItem.useMutation({
    onSuccess: (data) => {
      toast.success(`ספק נבחר לפריט!`);
      onSupplierSelected();
      refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בבחירת ספק: ${error.message}`);
    },
  });

  const handleSelectSupplier = (item: ItemRecommendation, supplier: ItemRecommendation['suppliers'][0]) => {
    setSelectedSuppliers(prev => ({ ...prev, [item.quoteItemId]: supplier.supplierId }));
    
    if (isDraftMode) {
      selectSupplierMutation.mutate({
        quoteId,
        quoteItemId: item.quoteItemId,
        supplierId: supplier.supplierId,
        pricePerUnit: supplier.pricePerUnit,
        deliveryDays: supplier.deliveryDays,
        markupPercentage,
      });
    } else if (canCreateJobs) {
      // TODO: Create job for single item
      toast.info('יצירת עבודה לפריט בודד - בקרוב');
    } else {
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

  const isPending = selectSupplierMutation.isPending;

  return (
    <div className="space-y-3">
      {(recommendations as ItemRecommendation[]).map((item) => (
        <div key={item.quoteItemId} className="p-3 bg-background rounded border">
          {/* Item Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-sm">{item.categoryName}</p>
              <p className="text-xs text-muted-foreground">{item.productName}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {item.quantity} יח'
            </Badge>
          </div>

          {/* Selected supplier indicator */}
          {selectedSuppliers[item.quoteItemId] && item.suppliers.some(s => s.supplierId === selectedSuppliers[item.quoteItemId]) && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  ספק נבחר: {item.suppliers.find(s => s.supplierId === selectedSuppliers[item.quoteItemId])?.supplierName}
                </span>
              </div>
              <span className="text-sm text-green-600">
                ₪{item.suppliers.find(s => s.supplierId === selectedSuppliers[item.quoteItemId])?.pricePerUnit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Suppliers for this item - show up to 5 */}
          {item.suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין ספקים זמינים לפריט זה</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {item.suppliers.slice(0, 5).map((supplier, index) => (
                <button
                  key={supplier.supplierId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSupplier(item, supplier);
                  }}
                  disabled={isPending}
                  className={cn(
                    "flex-1 min-w-[120px] max-w-[180px] p-2 rounded border text-right transition-all relative",
                    !isPending && "hover:shadow-sm cursor-pointer",
                    isPending && selectedSuppliers[item.quoteItemId] === supplier.supplierId && "opacity-70",
                    isPending && selectedSuppliers[item.quoteItemId] !== supplier.supplierId && "opacity-50",
                    index === 0 
                      ? "bg-green-50 border-green-200 hover:border-green-300"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {isPending && selectedSuppliers[item.quoteItemId] === supplier.supplierId && (
                    <Loader2 className="h-3 w-3 animate-spin absolute top-1 left-1" />
                  )}
                  <p className="font-medium text-sm truncate">{supplier.supplierName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">⭐ {supplier.avgRating.toFixed(1)}</span>
                    <span className="text-xs font-medium">₪{supplier.pricePerUnit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{supplier.deliveryDays} ימים</span>
                    <span className="text-xs text-muted-foreground">{supplier.reliabilityPct}% אמינות</span>
                  </div>
                  {/* Multi-item bonus indicator */}
                  {supplier.multiItemBonus > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 bg-blue-100 text-blue-700 border-blue-200">
                      +{supplier.multiItemBonus}% ({supplier.canFulfillOtherItems} מוצרים נוספים)
                    </Badge>
                  )}
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
