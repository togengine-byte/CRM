import React from "react";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Users, 
  TrendingUp,
  Activity,
} from "lucide-react";

// Import dashboard components
import { KPICard } from "@/components/dashboard/KPICard";
import { UnifiedPipelineCard } from "@/components/dashboard/UnifiedPipelineCard";
import { DeliveryCalendarCard } from "@/components/dashboard/DeliveryCalendarCard";
import { PendingSignupsCard } from "@/components/dashboard/PendingSignupsCard";
import { ActivityLogCard } from "@/components/dashboard/ActivityLogCard";

// Import utility functions
import { formatCurrency, formatNumber } from "@/utils/dashboardHelpers";

// ==================== MAIN HOME COMPONENT ====================

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: signups, isLoading: signupsLoading, refetch: refetchSignups } = trpc.dashboard.pendingSignups.useQuery();
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = trpc.dashboard.recentActivity.useQuery();

  const handleSignupsRefresh = () => {
    refetchSignups();
    refetchActivities();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">לוח בקרה</h1>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard 
          title="הצעות מחיר" 
          value={kpisLoading ? '—' : formatNumber(kpis?.totalQuotes || 0)}
          trend={(kpis?.totalQuotes || 0) > 0 ? "up" : "neutral"}
          trendValue={(kpis?.totalQuotes || 0) > 0 ? `${kpis?.quotesThisMonth || 0} החודש` : "אין נתונים"}
          icon={FileText}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          isLoading={kpisLoading}
        />
        <KPICard 
          title="לקוחות פעילים" 
          value={kpisLoading ? '—' : formatNumber(kpis?.activeCustomers || 0)}
          trend={(kpis?.activeCustomers || 0) > 0 ? "up" : "neutral"}
          trendValue={(kpis?.pendingApprovals || 0) > 0 ? `${kpis?.pendingApprovals} ממתינים` : "מעודכן"}
          icon={Users}
          iconColor="text-violet-600"
          iconBgColor="bg-violet-50"
          isLoading={kpisLoading}
        />
        <KPICard 
          title="הכנסות" 
          value={kpisLoading ? '—' : formatCurrency(kpis?.totalRevenue || 0)}
          trend={(kpis?.totalRevenue || 0) > 0 ? "up" : "neutral"}
          trendValue={(kpis?.avgDealValue || 0) > 0 ? `ממוצע ${formatCurrency(kpis?.avgDealValue || 0)}` : "אין נתונים"}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          isLoading={kpisLoading}
        />
        <KPICard 
          title="שיעור המרה" 
          value={kpisLoading ? '—' : `${kpis?.conversionRate || 0}%`}
          trend={(kpis?.conversionRate || 0) >= 50 ? "up" : (kpis?.conversionRate || 0) > 0 ? "neutral" : "down"}
          trendValue={(kpis?.conversionRate || 0) >= 50 ? "טוב" : (kpis?.conversionRate || 0) > 0 ? "סביר" : "אין נתונים"}
          icon={Activity}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
          isLoading={kpisLoading}
        />
      </div>

      {/* Unified Pipeline - Full Width */}
      <UnifiedPipelineCard isLoading={kpisLoading} />

      {/* Delivery Calendar - Full Width */}
      <DeliveryCalendarCard isLoading={kpisLoading} />

      {/* Pending Signups - Full Width */}
      <PendingSignupsCard 
        signups={signups || []} 
        isLoading={signupsLoading} 
        onRefresh={handleSignupsRefresh} 
      />

      {/* Activity Log - Full Width at Bottom */}
      <ActivityLogCard 
        activities={activities || []} 
        isLoading={activitiesLoading} 
      />
    </div>
  );
}
