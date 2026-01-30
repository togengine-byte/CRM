import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatTime } from "@/utils/dashboardHelpers";

export function ReadyForPickupCard({ isLoading: parentLoading }: { isLoading: boolean }) {
  const { data: pickups, isLoading } = trpc.jobs.readyForPickup.useQuery();
  const loading = parentLoading || isLoading;

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">מוכן לאיסוף</CardTitle>
          </div>
          {pickups && pickups.length > 0 && (
            <Badge className="text-[10px] px-2 py-0.5 h-5 bg-emerald-100 text-emerald-700 border-0">
              {pickups.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : !pickups || pickups.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-center">
            <p className="text-xs text-slate-400">אין עבודות ממתינות</p>
          </div>
        ) : (
          <div className="space-y-1">
            {pickups.slice(0, 4).map((pickup: any) => (
              <div 
                key={pickup.id}
                className="py-2 px-2 rounded hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{pickup.productName}</p>
                    <p className="text-[10px] text-slate-400">{pickup.supplierName} → {pickup.customerName}</p>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium shrink-0">
                    {formatTime(pickup.supplierReadyAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
