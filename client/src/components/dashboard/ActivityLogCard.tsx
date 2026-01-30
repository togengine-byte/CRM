import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Activity,
  Search,
  Calendar as CalendarIcon,
  X,
  FileText,
  Users,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Send,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// תרגום סוגי פעולות לעברית
const actionLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  // הצעות מחיר
  quote_created: { label: "הצעת מחיר נוצרה", icon: <Plus className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  quote_sent: { label: "הצעה נשלחה ללקוח", icon: <Send className="h-3 w-3" />, color: "text-indigo-600 bg-indigo-50" },
  quote_approved: { label: "הצעה אושרה", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  quote_rejected: { label: "הצעה נדחתה", icon: <XCircle className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
  quote_updated: { label: "הצעה עודכנה", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  QUOTE_REQUESTED: { label: "בקשת הצעת מחיר", icon: <FileText className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  QUOTE_REVISED: { label: "גרסה חדשה להצעה", icon: <FileText className="h-3 w-3" />, color: "text-purple-600 bg-purple-50" },
  QUOTE_IN_PRODUCTION: { label: "הצעה בייצור", icon: <Package className="h-3 w-3" />, color: "text-orange-600 bg-orange-50" },
  QUOTE_READY: { label: "הצעה מוכנה", icon: <CheckCircle className="h-3 w-3" />, color: "text-teal-600 bg-teal-50" },
  
  // לקוחות
  customer_created: { label: "לקוח חדש נוסף", icon: <Plus className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  customer_approved: { label: "לקוח אושר", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  customer_rejected: { label: "לקוח נדחה", icon: <XCircle className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
  customer_updated: { label: "פרטי לקוח עודכנו", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  customer_signup_request: { label: "בקשת הרשמה חדשה", icon: <Users className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  
  // ספקים
  supplier_created: { label: "ספק חדש נוסף", icon: <Plus className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  supplier_updated: { label: "פרטי ספק עודכנו", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  supplier_price_updated: { label: "מחיר ספק עודכן", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  supplier_assigned: { label: "ספק הוקצה לעבודה", icon: <User className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  
  // עבודות ושליחים
  supplier_job_created: { label: "עבודה נוצרה לספק", icon: <Plus className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  supplier_job_data_updated: { label: "נתוני עבודה עודכנו", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  job_accepted: { label: "ספק קיבל עבודה", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  job_ready: { label: "עבודה מוכנה לאיסוף", icon: <Package className="h-3 w-3" />, color: "text-teal-600 bg-teal-50" },
  job_picked_up: { label: "שליח אסף עבודה", icon: <Truck className="h-3 w-3" />, color: "text-orange-600 bg-orange-50" },
  job_delivered: { label: "עבודה נמסרה ללקוח", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  job_cancelled: { label: "עבודה בוטלה", icon: <XCircle className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
  job_status_updated: { label: "סטטוס עבודה עודכן", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  
  // מוצרים
  product_created: { label: "מוצר חדש נוסף", icon: <Plus className="h-3 w-3" />, color: "text-green-600 bg-green-50" },
  product_updated: { label: "מוצר עודכן", icon: <Edit className="h-3 w-3" />, color: "text-amber-600 bg-amber-50" },
  product_deleted: { label: "מוצר נמחק", icon: <Trash2 className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
  
  // דירוגים והערות
  deal_rated: { label: "עסקה דורגה", icon: <Star className="h-3 w-3" />, color: "text-yellow-600 bg-yellow-50" },
  note_created: { label: "הערה נוספה", icon: <FileText className="h-3 w-3" />, color: "text-slate-600 bg-slate-50" },
  note_deleted: { label: "הערה נמחקה", icon: <Trash2 className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
  
  // מחירונים
  pricelist_assigned: { label: "מחירון הוקצה", icon: <FileText className="h-3 w-3" />, color: "text-blue-600 bg-blue-50" },
  pricelist_removed: { label: "מחירון הוסר", icon: <Trash2 className="h-3 w-3" />, color: "text-red-600 bg-red-50" },
};

// תרגום תפקידים
const roleLabels: Record<string, string> = {
  admin: "מנהל ראשי",
  employee: "עובד",
  customer: "לקוח",
  supplier: "ספק",
  courier: "שליח",
};

const getActionDisplay = (actionType: string) => {
  return actionLabels[actionType] || {
    label: actionType.replace(/_/g, " ").replace(/([A-Z])/g, ' $1').trim(),
    icon: <Activity className="h-3 w-3" />,
    color: "text-slate-600 bg-slate-50"
  };
};

const formatDetails = (details: unknown, actionType: string): string => {
  if (!details) return "";
  if (typeof details === "string") return details;
  
  const obj = details as Record<string, unknown>;
  const parts: string[] = [];
  
  // פרטים ספציפיים לפי סוג פעולה
  if (actionType.includes("job") || actionType.includes("picked")) {
    if (obj.jobId) parts.push(`עבודה #${obj.jobId}`);
    if (obj.productName) parts.push(obj.productName as string);
    if (obj.supplierName) parts.push(`מספק: ${obj.supplierName}`);
    if (obj.customerName) parts.push(`ללקוח: ${obj.customerName}`);
  } else if (actionType.includes("quote")) {
    if (obj.quoteId) parts.push(`הצעה #${obj.quoteId}`);
    if (obj.customerName) parts.push(obj.customerName as string);
    if (obj.amount || obj.finalValue) parts.push(`₪${obj.amount || obj.finalValue}`);
  } else if (actionType.includes("customer")) {
    if (obj.customerName || obj.name) parts.push((obj.customerName || obj.name) as string);
    if (obj.companyName) parts.push(obj.companyName as string);
  } else if (actionType.includes("supplier")) {
    if (obj.supplierName || obj.name) parts.push((obj.supplierName || obj.name) as string);
    if (obj.price) parts.push(`מחיר: ₪${obj.price}`);
  } else if (actionType.includes("product")) {
    if (obj.productName || obj.name) parts.push((obj.productName || obj.name) as string);
  }
  
  // פרטים כלליים
  if (parts.length === 0) {
    if (obj.quoteId) parts.push(`הצעה #${obj.quoteId}`);
    if (obj.customerId) parts.push(`לקוח #${obj.customerId}`);
    if (obj.supplierId) parts.push(`ספק #${obj.supplierId}`);
    if (obj.name) parts.push(obj.name as string);
  }
  
  return parts.join(" • ");
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "עכשיו";
  if (diffMins < 60) return `לפני ${diffMins} דק׳`;
  if (diffHours < 24) return `לפני ${diffHours} שע׳`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  
  return format(date, "dd/MM", { locale: he });
};

const formatFullDateTime = (dateString: string): string => {
  return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: he });
};

// ==================== ACTIVITY LOG CARD ====================

interface ActivityLogCardProps {
  activities: any[];
  isLoading: boolean;
}

export function ActivityLogCard({ activities, isLoading }: ActivityLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 15;

  // שליפת נתונים מורחבים כשמורחב
  const { data: expandedData, isLoading: expandedLoading, refetch } = trpc.activity.list.useQuery({
    customerName: searchQuery || undefined,
    actionType: selectedActionType !== "all" ? selectedActionType : undefined,
    startDate,
    endDate,
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  }, {
    enabled: isExpanded,
  });

  const { data: actionTypes } = trpc.activity.actionTypes.useQuery(undefined, {
    enabled: isExpanded,
  });

  // רשימת משתמשים ייחודיים מהפעילויות
  const uniqueUsers = React.useMemo(() => {
    const users = new Set<string>();
    activities.forEach(a => {
      if (a.userName) users.add(a.userName);
    });
    return Array.from(users);
  }, [activities]);

  const totalPages = Math.ceil((expandedData?.total || 0) / PAGE_SIZE);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedActionType("all");
    setSelectedUser("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(0);
  };

  const hasActiveFilters = searchQuery || selectedActionType !== "all" || selectedUser !== "all" || startDate || endDate;

  // סינון פעילויות לתצוגה מקוצרת
  const filteredActivities = React.useMemo(() => {
    let filtered = activities;
    if (selectedUser !== "all") {
      filtered = filtered.filter(a => a.userName === selectedUser);
    }
    return filtered;
  }, [activities, selectedUser]);

  const displayActivities = isExpanded 
    ? (expandedData?.activities || [])
    : filteredActivities.slice(0, 6);

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Activity className="h-4 w-4 text-slate-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">יומן פעילות</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 ml-1" />
                רענן
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 ml-1" />
                  הצג פחות
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 ml-1" />
                  הצג יותר
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3">
        {/* פילטרים - מוצגים רק במצב מורחב */}
        {isExpanded && (
          <div className="mb-4 space-y-3 pb-4 border-b border-slate-100">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {/* חיפוש */}
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="pr-8 h-8 text-xs"
                />
              </div>

              {/* סוג פעולה */}
              <Select
                value={selectedActionType}
                onValueChange={(value) => {
                  setSelectedActionType(value);
                  setCurrentPage(0);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="סוג פעולה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הפעולות</SelectItem>
                  {actionTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getActionDisplay(type).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* משתמש */}
              <Select
                value={selectedUser}
                onValueChange={(value) => {
                  setSelectedUser(value);
                  setCurrentPage(0);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="משתמש" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המשתמשים</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* מתאריך */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 justify-start text-right text-xs font-normal",
                      !startDate && "text-slate-500"
                    )}
                  >
                    <CalendarIcon className="ml-1 h-3 w-3" />
                    {startDate ? format(startDate, "dd/MM/yy", { locale: he }) : "מתאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setCurrentPage(0);
                    }}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>

              {/* עד תאריך */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 justify-start text-right text-xs font-normal",
                      !endDate && "text-slate-500"
                    )}
                  >
                    <CalendarIcon className="ml-1 h-3 w-3" />
                    {endDate ? format(endDate, "dd/MM/yy", { locale: he }) : "עד תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setCurrentPage(0);
                    }}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ניקוי סינון */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs px-2">
                  <X className="ml-1 h-3 w-3" />
                  נקה סינון
                </Button>
                <span className="text-xs text-slate-500">
                  {expandedData?.total || 0} תוצאות
                </span>
              </div>
            )}
          </div>
        )}

        {/* רשימת פעילויות */}
        {(isLoading || (isExpanded && expandedLoading)) ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-xs text-slate-400">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className={cn(
            "space-y-1",
            isExpanded && "max-h-[400px] overflow-y-auto"
          )}>
            {displayActivities.map((activity: any, index: number) => {
              const display = getActionDisplay(activity.actionType);
              return (
                <div 
                  key={activity.id || index} 
                  className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", display.color)}>
                    {display.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-800">
                        {display.label}
                      </span>
                      {activity.userName && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-slate-100">
                          {activity.userName}
                        </Badge>
                      )}
                      {activity.userRole && (
                        <span className="text-[10px] text-slate-400">
                          ({roleLabels[activity.userRole] || activity.userRole})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {formatDetails(activity.details, activity.actionType)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">
                    {isExpanded ? formatFullDateTime(activity.createdAt) : formatTime(activity.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* עימוד - רק במצב מורחב */}
        {isExpanded && totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              עמוד {currentPage + 1} מתוך {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="h-7 text-xs"
              >
                <ChevronRight className="h-3 w-3" />
                הקודם
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="h-7 text-xs"
              >
                הבא
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityLogCard;
