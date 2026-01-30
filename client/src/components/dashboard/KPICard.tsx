import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  isLoading?: boolean;
}

export function KPICard({ 
  title, 
  value, 
  trend, 
  trendValue,
  icon: Icon,
  iconColor = 'text-slate-400',
  iconBgColor = 'bg-slate-50',
  isLoading 
}: KPICardProps) {
  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">{title}</p>
              <p className="text-xl font-semibold text-slate-900 tracking-tight">{value}</p>
              <div className={`flex items-center gap-1 text-[10px] font-medium ${
                trend === 'up' ? 'text-emerald-600' : 
                trend === 'down' ? 'text-red-500' : 
                'text-slate-400'
              }`}>
                {trend === 'up' && <ArrowUpRight className="h-2.5 w-2.5" />}
                {trend === 'down' && <ArrowDownRight className="h-2.5 w-2.5" />}
                <span>{trendValue}</span>
              </div>
            </div>
            <div className={`h-10 w-10 rounded-lg ${iconBgColor} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
