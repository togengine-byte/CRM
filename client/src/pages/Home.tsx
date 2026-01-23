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
  AlertCircle,
  Inbox
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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

// New component for pending quote requests from landing page
function PendingSignupsCard({ signups, isLoading }: { signups: any[]; isLoading: boolean }) {
  return (
    <Card className="animate-slide-up opacity-0 stagger-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            בקשות הצעות מחיר חדשות
          </CardTitle>
          {signups.length > 0 && (
            <Badge variant="outline" className="text-[11px] font-normal bg-blue-50 text-blue-700 border-blue-200">
              {signups.length} חדשות
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : signups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין בקשות חדשות</p>
          </div>
        ) : (
          <div className="space-y-2">
            {signups.slice(0, 4).map((signup) => (
              <div 
                key={signup.id} 
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-blue-700">
                      #{signup.queueNumber || signup.id}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{signup.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {signup.companyName || signup.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[11px] font-normal bg-amber-50 text-amber-700 border-amber-200">
                    ממתין
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {signup.createdAt ? formatDate(signup.createdAt) : ''}
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
  supplier_created: "ספק נוצר",
  supplier_updated: "ספק עודכן",
  supplier_deleted: "ספק נמחק",
  user_login: "התחברות",
  user_logout: "התנתקות",
};

function ActivityFeedCard({ activities, isLoading }: { activities: any[]; isLoading: boolean }) {
  const getActivityIcon = (actionType: string) => {
    if (actionType.includes('QUOTE')) return <FileText className="h-3 w-3" />;
    if (actionType.includes('customer') || actionType.includes('user')) return <Users className="h-3 w-3" />;
    if (actionType.includes('product') || actionType.includes('variant')) return <TrendingUp className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <Card className="animate-slide-up opacity-0 stagger-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" />
            פעילות אחרונה
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => toast.info("בקרוב")}>
            צפה בהכל
            <ChevronLeft className="h-3 w-3 mr-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  {getActivityIcon(activity.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {actionTypeLabels[activity.actionType] || activity.actionType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: "הצעת מחיר חדשה", icon: Plus, onClick: () => toast.info("בקרוב") },
    { label: "הוסף לקוח", icon: Users, onClick: () => toast.info("בקרוב") },
    { label: "הוסף מוצר", icon: FileText, onClick: () => toast.info("בקרוב") },
  ];

  return (
    <Card className="animate-slide-up opacity-0 stagger-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">פעולות מהירות</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2">
          {actions.map((action, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="justify-start gap-2 h-10"
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: quotes, isLoading: quotesLoading } = trpc.dashboard.recentQuotes.useQuery();
  const { data: customers, isLoading: customersLoading } = trpc.dashboard.pendingCustomers.useQuery();
  const { data: signups, isLoading: signupsLoading } = trpc.dashboard.pendingSignups.useQuery();
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

      {/* Secondary Grid - Now with 4 columns on large screens */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PendingSignupsCard signups={signups || []} isLoading={signupsLoading} />
        <PendingQuotesCard quotes={quotes || []} isLoading={quotesLoading} />
        <PendingApprovalsCard customers={customers || []} isLoading={customersLoading} />
        <ActivityFeedCard activities={activities || []} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
