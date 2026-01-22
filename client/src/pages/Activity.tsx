import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Filter,
  RefreshCw,
  Calendar as CalendarIcon,
  User,
  FileText,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Send,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Hebrew translations for action types
const actionTypeTranslations: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  // Quote actions
  QUOTE_REQUESTED: { label: "בקשת הצעת מחיר", icon: <FileText className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  QUOTE_UPDATED: { label: "עדכון הצעת מחיר", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  QUOTE_REVISED: { label: "גרסה חדשה להצעה", icon: <FileText className="h-4 w-4" />, color: "bg-purple-100 text-purple-700" },
  QUOTE_SENT: { label: "הצעה נשלחה", icon: <Send className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  QUOTE_APPROVED: { label: "הצעה אושרה", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  QUOTE_REJECTED: { label: "הצעה נדחתה", icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
  QUOTE_IN_PRODUCTION: { label: "הצעה בייצור", icon: <Package className="h-4 w-4" />, color: "bg-orange-100 text-orange-700" },
  QUOTE_READY: { label: "הצעה מוכנה", icon: <CheckCircle className="h-4 w-4" />, color: "bg-teal-100 text-teal-700" },
  DEAL_RATED: { label: "דירוג עסקה", icon: <Star className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  
  // Product actions
  product_created: { label: "מוצר נוצר", icon: <Plus className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  product_updated: { label: "מוצר עודכן", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  product_deleted: { label: "מוצר נמחק", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
  variant_created: { label: "וריאנט נוצר", icon: <Plus className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  variant_updated: { label: "וריאנט עודכן", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  variant_deleted: { label: "וריאנט נמחק", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
  
  // Customer actions
  customer_approved: { label: "לקוח אושר", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  customer_rejected: { label: "לקוח נדחה", icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
  customer_updated: { label: "לקוח עודכן", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  pricelist_assigned: { label: "מחירון הוקצה", icon: <FileText className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  pricelist_removed: { label: "מחירון הוסר", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
  
  // Supplier actions
  supplier_created: { label: "ספק נוצר", icon: <Plus className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  supplier_updated: { label: "ספק עודכן", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  supplier_price_updated: { label: "מחיר ספק עודכן", icon: <Edit className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  supplier_assigned: { label: "ספק הוקצה לעבודה", icon: <User className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  
  // Courier actions
  job_picked_up: { label: "עבודה נאספה", icon: <Truck className="h-4 w-4" />, color: "bg-orange-100 text-orange-700" },
  job_delivered: { label: "עבודה נמסרה", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  
  // Notes
  note_created: { label: "הערה נוספה", icon: <FileText className="h-4 w-4" />, color: "bg-gray-100 text-gray-700" },
  note_deleted: { label: "הערה נמחקה", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
};

const getActionDisplay = (actionType: string) => {
  return actionTypeTranslations[actionType] || {
    label: actionType.replace(/_/g, " "),
    icon: <Activity className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-700"
  };
};

const formatDetails = (details: unknown): string => {
  if (!details) return "";
  if (typeof details === "string") return details;
  
  const obj = details as Record<string, unknown>;
  const parts: string[] = [];
  
  if (obj.quoteId) parts.push(`הצעה #${obj.quoteId}`);
  if (obj.customerId) parts.push(`לקוח #${obj.customerId}`);
  if (obj.supplierId) parts.push(`ספק #${obj.supplierId}`);
  if (obj.productId) parts.push(`מוצר #${obj.productId}`);
  if (obj.variantId) parts.push(`וריאנט #${obj.variantId}`);
  if (obj.rating) parts.push(`דירוג: ${obj.rating}`);
  if (obj.reason) parts.push(`סיבה: ${obj.reason}`);
  if (obj.version) parts.push(`גרסה ${obj.version}`);
  if (obj.name) parts.push(`${obj.name}`);
  if (obj.price) parts.push(`מחיר: ₪${obj.price}`);
  
  return parts.join(" | ");
};

const PAGE_SIZE = 20;

export default function ActivityPage() {
  const [searchName, setSearchName] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(0);

  const filters = useMemo(() => ({
    customerName: searchName || undefined,
    actionType: selectedActionType !== "all" ? selectedActionType : undefined,
    startDate,
    endDate,
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  }), [searchName, selectedActionType, startDate, endDate, currentPage]);

  const { data, isLoading, refetch } = trpc.activity.list.useQuery(filters);
  const { data: actionTypes } = trpc.activity.actionTypes.useQuery();

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const clearFilters = () => {
    setSearchName("");
    setSelectedActionType("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(0);
  };

  const hasActiveFilters = searchName || selectedActionType !== "all" || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">יומן פעילות</h1>
          <p className="text-muted-foreground">מעקב מלא אחר כל הפעולות במערכת</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ml-2 h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            מסננים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search by name */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם לקוח/עובד..."
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(0);
                }}
                className="pr-10"
              />
            </div>

            {/* Action type filter */}
            <Select
              value={selectedActionType}
              onValueChange={(value) => {
                setSelectedActionType(value);
                setCurrentPage(0);
              }}
            >
              <SelectTrigger>
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

            {/* Start date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-right font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: he }) : "מתאריך"}
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
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* End date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-right font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: he }) : "עד תאריך"}
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
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="ml-1 h-4 w-4" />
                נקה מסננים
              </Button>
              <span className="text-sm text-muted-foreground">
                {data?.total || 0} תוצאות
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            רשימת פעילויות
            {data?.total !== undefined && (
              <Badge variant="secondary" className="mr-2">
                {data.total} פעילויות
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data?.activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין פעילויות</h3>
              <p className="text-muted-foreground mt-1">לא נמצאו פעילויות התואמות לחיפוש</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תאריך ושעה</TableHead>
                      <TableHead className="text-right">פעולה</TableHead>
                      <TableHead className="text-right">משתמש</TableHead>
                      <TableHead className="text-right">פרטים</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.activities.map((activity) => {
                      const display = getActionDisplay(activity.actionType);
                      return (
                        <TableRow key={activity.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="text-sm">
                              {format(new Date(activity.createdAt), "dd/MM/yyyy", { locale: he })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(activity.createdAt), "HH:mm:ss")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", display.color)}>
                              {display.icon}
                              {display.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {activity.userName ? (
                              <div>
                                <div className="font-medium">{activity.userName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {activity.userEmail}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">מערכת</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <span className="text-sm text-muted-foreground">
                              {formatDetails(activity.details)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    עמוד {currentPage + 1} מתוך {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                      הקודם
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      הבא
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
