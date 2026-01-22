import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Users, 
  TrendingUp,
  ArrowUpLeft,
  ArrowDownLeft,
  CheckCircle2,
  Activity,
  Truck,
  Plus,
  ChevronLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL').format(value);
}

function OpenJobsCard({ isLoading }: { isLoading: boolean }) {
  const mockJobs = [
    { id: 1, supplier: "דפוס הצפון", product: "כרטיסי ביקור", quantity: 500, status: "בהדפסה", dueDate: "03/01" },
    { id: 2, supplier: "אריזות ישראל", product: "קופסאות מתנה", quantity: 200, status: "ממתין לאישור", dueDate: "05/01" },
    { id: 3, supplier: "פרינט פלוס", product: "ברושורים A4", quantity: 1000, status: "בייצור", dueDate: "04/01" },
  ];

  const getStatusStyle = (status: string) => {
    if (status === "בהדפסה" || status === "בייצור") return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "ממתין לאישור") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <Card className="col-span-full lg:col-span-2 animate-slide-up opacity-0 stagger-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Truck className="h-4 w-4 text-muted-foreground" />
            עבודות פתוחות אצל ספקים
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => toast.info("בקרוב")}>
            צפה בהכל
            <ChevronLeft className="h-3 w-3 mr-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mockJobs.map((job) => (
              <div 
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{job.product}</span>
                    <span className="text-xs text-muted-foreground">{job.supplier} · {formatNumber(job.quantity)} יח'</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-[11px] font-normal ${getStatusStyle(job.status)}`}>
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">עד {job.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingQuotesCard({ quotes, isLoading }: { quotes: any[]; isLoading: boolean }) {
  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-50 text-slate-600 border-slate-200',
      sent: 'bg-blue-50 text-blue-700 border-blue-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
      in_production: 'bg-amber-50 text-amber-700 border-amber-200',
      ready: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return styles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const statusLabels: Record<string, string> = {
    draft: 'טיוטה',
    sent: 'נשלח',
    approved: 'אושר',
    rejected: 'נדחה',
    in_production: 'בייצור',
    ready: 'מוכן',
  };

  return (
    <Card className="animate-slide-up opacity-0 stagger-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            הצעות מחיר ממתינות
          </CardTitle>
          <span className="text-xs text-muted-foreground">{quotes.length || 0}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין הצעות ממתינות</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.slice(0, 4).map((quote) => (
              <div 
                key={quote.id} 
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{quote.customerName || 'לקוח לא ידוע'}</p>
                  <p className="text-xs text-muted-foreground">
                    {quote.finalValue ? formatCurrency(parseFloat(quote.finalValue)) : 'ממתין לתמחור'}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[11px] font-normal ${getStatusStyle(quote.status)}`}>
                  {statusLabels[quote.status] || quote.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingApprovalsCard({ customers, isLoading }: { customers: any[]; isLoading: boolean }) {
  return (
    <Card className="animate-slide-up opacity-0 stagger-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            לקוחות ממתינים לאישור
          </CardTitle>
          {customers.length > 0 && (
            <Badge variant="outline" className="text-[11px] font-normal bg-amber-50 text-amber-700 border-amber-200">
              {customers.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">הכל מאושר</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.slice(0, 4).map((customer) => (
              <div 
                key={customer.id} 
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-foreground">
                      {customer.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{customer.name || 'לא ידוע'}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">{customer.email || 'אין אימייל'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("בקרוב")}>
                  אשר
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPICard({ 
  title, 
  value, 
  trend,
  trendValue,
}: { 
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {trend && trendValue && (
          <span className={`flex items-center text-xs ${
            trend === 'up' ? 'text-emerald-600' : 
            trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? <ArrowUpLeft className="h-3 w-3" /> : 
             trend === 'down' ? <ArrowDownLeft className="h-3 w-3" /> : null}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// Hebrew translations for action types
const actionTypeLabels: Record<string, string> = {
  QUOTE_REQUESTED: "בקשת הצעת מחיר",
  QUOTE_UPDATED: "עדכון הצעת מחיר",
  QUOTE_REVISED: "גרסה חדשה להצעה",
  QUOTE_SENT: "הצעה נשלחה",
  QUOTE_APPROVED: "הצעה אושרה",
  QUOTE_REJECTED: "הצעה נדחתה",
  QUOTE_IN_PRODUCTION: "הצעה בייצור",
  QUOTE_READY: "הצעה מוכנה",
  DEAL_RATED: "דירוג עסקה",
  product_created: "מוצר נוצר",
  product_updated: "מוצר עודכן",
  product_deleted: "מוצר נמחק",
  variant_created: "וריאנט נוצר",
  variant_updated: "וריאנט עודכן",
  variant_deleted: "וריאנט נמחק",
  customer_approved: "לקוח אושר",
  customer_rejected: "לקוח נדחה",
  customer_updated: "לקוח עודכן",
  pricelist_assigned: "מחירון הוקצה",
  pricelist_removed: "מחירון הוסר",
  supplier_created: "ספק נוצר",
  supplier_updated: "ספק עודכן",
  supplier_price_updated: "מחיר ספק עודכן",
  supplier_assigned: "ספק הוקצה לעבודה",
  job_picked_up: "עבודה נאספה",
  job_delivered: "עבודה נמסרה",
  note_created: "הערה נוספה",
  note_deleted: "הערה נמחקה",
};

const getActionLabel = (actionType: string): string => {
  return actionTypeLabels[actionType] || actionType.replace(/_/g, " ");
};

function ActivityFeedCard({ activities, isLoading }: { activities: any[]; isLoading: boolean }) {
  const getActivityIcon = (type: string) => {
    if (type.includes('QUOTE')) return FileText;
    if (type.includes('customer') || type.includes('CUSTOMER')) return Users;
    if (type.includes('APPROVED') || type.includes('approved')) return CheckCircle2;
    return Activity;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דק'`;
    if (hours < 24) return `לפני ${hours} שע'`;
    return `לפני ${days} ימים`;
  };

  return (
    <Card className="animate-slide-up opacity-0 stagger-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            פעילות אחרונה
          </CardTitle>
          <a href="/activity" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            צפה בהכל
            <ChevronLeft className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const Icon = getActivityIcon(activity.actionType);
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.userName || 'משתמש'}</span>
                      {' '}
                      <span className="text-muted-foreground">{getActionLabel(activity.actionType)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="animate-slide-up opacity-0 stagger-5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <Plus className="h-4 w-4 text-muted-foreground" />
          פעולות מהירות
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => toast.info("בקרוב")}>
            <FileText className="h-4 w-4" />
            <span className="text-xs">הצעת מחיר</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => toast.info("בקרוב")}>
            <Users className="h-4 w-4" />
            <span className="text-xs">לקוח חדש</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => toast.info("בקרוב")}>
            <Truck className="h-4 w-4" />
            <span className="text-xs">ספק חדש</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => toast.info("בקרוב")}>
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">דוח מהיר</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: quotes, isLoading: quotesLoading } = trpc.dashboard.recentQuotes.useQuery();
  const { data: customers, isLoading: customersLoading } = trpc.dashboard.pendingCustomers.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.recentActivity.useQuery();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">לוח בקרה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            סקירה כללית של הפעילות העסקית שלך
          </p>
        </div>
        <Button onClick={() => toast.info("בקרוב")} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          הצעת מחיר חדשה
        </Button>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="סה״כ הצעות" 
          value={kpisLoading ? '...' : formatNumber(kpis?.totalQuotes || 0)}
          trend="up"
          trendValue="+12%"
        />
        <KPICard 
          title="לקוחות פעילים" 
          value={kpisLoading ? '...' : formatNumber(kpis?.activeCustomers || 0)}
          trend="up"
          trendValue="+5%"
        />
        <KPICard 
          title="הכנסות" 
          value={kpisLoading ? '...' : formatCurrency(kpis?.totalRevenue || 0)}
          trend="up"
          trendValue="+18%"
        />
        <KPICard 
          title="שיעור המרה" 
          value={kpisLoading ? '...' : `${kpis?.conversionRate || 0}%`}
          trend="neutral"
          trendValue="יציב"
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Jobs - Large Card */}
        <OpenJobsCard isLoading={kpisLoading} />
        
        {/* Quick Actions */}
        <QuickActionsCard />
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PendingQuotesCard quotes={quotes || []} isLoading={quotesLoading} />
        <PendingApprovalsCard customers={customers || []} isLoading={customersLoading} />
        <ActivityFeedCard activities={activities || []} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
