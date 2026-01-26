import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  CheckCircle,
  RefreshCw,
  Eye,
  Factory,
  Truck,
  Package,
  User,
  Calendar,
  DollarSign,
  Clock,
  Send,
  Sparkles,
  Star,
  Zap,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteItem {
  id: number;
  sizeQuantityId: number;
  quantity: number;
  priceAtTimeOfQuote: string;
  supplierId: number | null;
  supplierCost: string | null;
  deliveryDays: number | null;
  productName?: string;
  sizeName?: string;
}

interface Quote {
  id: number;
  customerId: number;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  version: number;
  finalValue: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
}

interface SupplierRecommendation {
  supplierId: number;
  supplierName: string;
  supplierCompany?: string | null;
  supplierNumber?: number;
  rank: number;
  isNewSupplier?: boolean;
  scores: {
    baseScore: number;
    priceScore: number;
    promiseKeepingScore: number;
    courierConfirmScore: number;
    earlyFinishScore: number;
    categoryExpertScore: number;
    currentLoadScore: number;
    consistencyScore: number;
    cancellationScore: number;
    totalScore: number;
  };
  metrics: {
    completedJobs: number;
    supplierPrice: number;
    marketAveragePrice: number;
    promiseKeeping: { totalJobs: number; onTimeJobs: number; percentage: number };
    courierConfirm: { totalReadyJobs: number; confirmedJobs: number; percentage: number };
    earlyFinish: { avgDaysEarly: number; totalJobs: number };
    categoryExpertise: { jobsInCategory: number; totalJobs: number; percentage: number };
    currentLoad: number;
    consistency: { stdDev: number; avgDays: number; isConsistent: boolean };
    cancellations: { totalJobs: number; cancelledJobs: number; percentage: number };
  };
}

export default function CustomerApproved() {
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendedSupplier, setRecommendedSupplier] = useState<SupplierRecommendation | null>(null);
  const [allRecommendations, setAllRecommendations] = useState<SupplierRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const utils = trpc.useUtils();

  // Get quotes with 'approved' status (customer approved, pending supplier selection)
  const { data: quotes, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: "approved",
  });

  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId }
  );

  // Get suppliers list
  const { data: suppliers } = trpc.suppliers.list.useQuery({});

  // Get supplier recommendations
  const getRecommendationsMutation = trpc.suppliers.allRecommendations.useQuery(
    {},
    { enabled: false }
  );

  // Assign supplier mutation
  const assignSupplierMutation = trpc.quotes.assignSupplier.useMutation({
    onSuccess: () => {
      toast.success("ספק הוקצה בהצלחה - ההצעה עברה לייצור");
      refetch();
      utils.quotes.getById.refetch();
      setIsSupplierDialogOpen(false);
      setSelectedSupplierId("");
      setRecommendedSupplier(null);
      setAllRecommendations([]);
      setShowRecommendations(false);
    },
    onError: (error) => {
      toast.error(`שגיאה בהקצאת ספק: ${error.message}`);
    },
  });

  // Move to production mutation (for quotes with suppliers already assigned)
  const moveToProductionMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("ההצעה עברה לייצור בהצלחה");
      refetch();
      utils.quotes.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה במעבר לייצור: ${error.message}`);
    },
  });

  const handleRowClick = (quoteId: number) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null);
    } else {
      setExpandedQuoteId(quoteId);
    }
  };

  const handleOpenSupplierDialog = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setIsSupplierDialogOpen(true);
    setRecommendedSupplier(null);
    setAllRecommendations([]);
    setShowRecommendations(false);
    setSelectedSupplierId("");
  };

  const handleGetRecommendation = async () => {
    setIsLoadingRecommendation(true);
    setShowRecommendations(true);
    try {
      const result = await utils.suppliers.allRecommendations.fetch({});
      if (result && result.length > 0) {
        setAllRecommendations(result);
        setRecommendedSupplier(result[0]);
        setSelectedSupplierId(result[0].supplierId.toString());
        toast.success(`נמצא ספק מומלץ: ${result[0].supplierName || result[0].supplierCompany}`);
      } else {
        toast.error("לא נמצאו ספקים מומלצים");
      }
    } catch (error) {
      toast.error("שגיאה בקבלת המלצות");
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const handleSelectRecommendedSupplier = (supplier: SupplierRecommendation) => {
    setRecommendedSupplier(supplier);
    setSelectedSupplierId(supplier.supplierId.toString());
  };

  const handleAssignSupplier = () => {
    if (selectedQuoteId && selectedSupplierId) {
      assignSupplierMutation.mutate({
        quoteId: selectedQuoteId,
        supplierId: parseInt(selectedSupplierId),
      });
    }
  };

  const handleMoveToProduction = (quoteId: number) => {
    moveToProductionMutation.mutate({
      quoteId,
      status: "in_production",
    });
  };

  // Check if all items have suppliers
  const allItemsHaveSuppliers = (items: QuoteItem[] | undefined) => {
    if (!items || items.length === 0) return false;
    return items.every(item => item.supplierId !== null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-amber-100";
    return "bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            אושר על ידי הלקוח
          </h1>
          <p className="text-muted-foreground">הצעות שאושרו על ידי הלקוח וממתינות לבחירת ספק ושליחה לייצור</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ml-2 h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות לספק</p>
                <p className="text-2xl font-bold text-amber-600">
                  {quotes?.filter(q => !allItemsHaveSuppliers(q.items as any)).length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">מוכנות לייצור</p>
                <p className="text-2xl font-bold text-green-600">
                  {quotes?.filter(q => allItemsHaveSuppliers(q.items as any)).length || 0}
                </p>
              </div>
              <Factory className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה"כ הצעות</p>
                <p className="text-2xl font-bold">{quotes?.length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            הצעות שאושרו על ידי הלקוח
            {quotes && quotes.length > 0 && (
              <Badge variant="outline" className="mr-2">
                {quotes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quotes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין הצעות ממתינות</h3>
              <p className="text-muted-foreground mt-1">כל ההצעות שאושרו על ידי הלקוח כבר נשלחו לייצור</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">תאריך אישור</TableHead>
                  <TableHead className="text-right">סה״כ</TableHead>
                  <TableHead className="text-right">סטטוס ספק</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote: any) => {
                  const hasAllSuppliers = allItemsHaveSuppliers(quote.items);
                  return (
                    <>
                      <TableRow
                        key={quote.id}
                        onClick={() => handleRowClick(quote.id)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>{quote.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {quote.customerName || "לקוח לא מזוהה"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(quote.updatedAt).toLocaleDateString("he-IL")}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            {quote.finalValue ? `₪${Number(quote.finalValue).toLocaleString()}` : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasAllSuppliers ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <Truck className="h-3 w-3 ml-1" />
                              ספק מוקצה
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              <Clock className="h-3 w-3 ml-1" />
                              ממתין לספק
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(quote.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasAllSuppliers ? (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToProduction(quote.id);
                                }}
                                disabled={moveToProductionMutation.isPending}
                              >
                                <Factory className="h-4 w-4 ml-1" />
                                שלח לייצור
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSupplierDialog(quote.id);
                                }}
                              >
                                <Truck className="h-4 w-4 ml-1" />
                                בחר ספק
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      {expandedQuoteId === quote.id && quoteDetails && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="p-6 space-y-6">
                              {/* Customer Info */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">לקוח</p>
                                  <p className="font-medium">{quote.customerName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">אימייל</p>
                                  <p className="font-medium">{quote.customerEmail || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">תאריך אישור</p>
                                  <p className="font-medium">{new Date(quote.updatedAt).toLocaleDateString("he-IL")}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">סה"כ</p>
                                  <p className="font-medium text-lg text-green-600">
                                    {quote.finalValue ? `₪${Number(quote.finalValue).toLocaleString()}` : "-"}
                                  </p>
                                </div>
                              </div>

                              {/* Items */}
                              {quoteDetails.items && quoteDetails.items.length > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">פריטים ({quoteDetails.items.length})</p>
                                  <div className="space-y-2">
                                    {quoteDetails.items.map((item: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                                        <div className="flex items-center gap-3">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{item.productName || `פריט ${item.sizeQuantityId}`}</span>
                                          <span className="text-muted-foreground">× {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="font-medium">
                                            {item.priceAtTimeOfQuote ? `₪${Number(item.priceAtTimeOfQuote).toLocaleString()}` : '-'}
                                          </span>
                                          {item.supplierId ? (
                                            <Badge className="bg-green-100 text-green-800">
                                              <Truck className="h-3 w-3 ml-1" />
                                              ספק #{item.supplierId}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                                              ללא ספק
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-3 pt-4 border-t">
                                {hasAllSuppliers ? (
                                  <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleMoveToProduction(quote.id)}
                                    disabled={moveToProductionMutation.isPending}
                                  >
                                    <Factory className="h-4 w-4 ml-2" />
                                    שלח לייצור
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                    onClick={() => handleOpenSupplierDialog(quote.id)}
                                  >
                                    <Truck className="h-4 w-4 ml-2" />
                                    בחר ספק לכל הפריטים
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Supplier Selection Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              בחירת ספק להצעה #{selectedQuoteId}
            </DialogTitle>
            <DialogDescription>
              בחר ספק ידנית או קבל המלצה מהמערכת על סמך דירוג, מחיר וזמן אספקה
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {/* Two Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manual Selection */}
              <Card className={cn(
                "cursor-pointer transition-all border-2",
                !showRecommendations ? "border-purple-500 bg-purple-50/50" : "border-transparent hover:border-gray-300"
              )}
              onClick={() => setShowRecommendations(false)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Truck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">בחירה ידנית</h3>
                      <p className="text-sm text-muted-foreground">בחר ספק מהרשימה</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Recommendation */}
              <Card className={cn(
                "cursor-pointer transition-all border-2",
                showRecommendations ? "border-amber-500 bg-amber-50/50" : "border-transparent hover:border-gray-300"
              )}
              onClick={handleGetRecommendation}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-amber-100">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">המלצת מערכת</h3>
                      <p className="text-sm text-muted-foreground">הספק הטוב ביותר לפי האלגוריתם</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Manual Selection Dropdown */}
            {!showRecommendations && (
              <div className="space-y-2">
                <label className="text-sm font-medium">בחר ספק:</label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ספק מהרשימה" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {supplier.name} {supplier.companyName && `- ${supplier.companyName}`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* System Recommendations */}
            {showRecommendations && (
              <div className="space-y-4">
                {isLoadingRecommendation ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-amber-600" />
                    <span className="mr-2 text-muted-foreground">מחשב המלצות...</span>
                  </div>
                ) : allRecommendations.length > 0 ? (
                  <>
                    <div className="text-xs text-muted-foreground mb-2">ספקים ממוינים לפי ציון כולל</div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-600">#</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-600">ספק</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-600">ציון</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-600">אמינות</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-600">עבודות</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-600">עומס</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allRecommendations.slice(0, 5).map((rec, index) => (
                            <tr
                              key={rec.supplierId}
                              onClick={() => handleSelectRecommendedSupplier(rec)}
                              className={cn(
                                "cursor-pointer transition-all border-b last:border-b-0",
                                selectedSupplierId === rec.supplierId.toString()
                                  ? "bg-amber-100"
                                  : "hover:bg-amber-50"
                              )}
                            >
                              <td className="px-2 py-2">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  index === 0 ? "bg-amber-500 text-white" :
                                  index === 1 ? "bg-gray-400 text-white" :
                                  index === 2 ? "bg-amber-700 text-white" :
                                  "bg-gray-200 text-gray-600"
                                )}>
                                  {rec.rank}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{rec.supplierName || rec.supplierCompany || `ספק #${rec.supplierId}`}</span>
                                  {index === 0 && <Sparkles className="h-3 w-3 text-amber-500" />}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className={cn("font-bold", getScoreColor(rec.scores?.totalScore || 0))}>
                                  {Math.round(rec.scores?.totalScore || 0)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center text-green-600">
                                {Math.round(rec.metrics?.promiseKeeping?.percentage || 0)}%
                              </td>
                              <td className="px-2 py-2 text-center">
                                {rec.metrics?.completedJobs || 0}
                              </td>
                              <td className="px-2 py-2 text-center text-blue-600">
                                {rec.metrics?.currentLoad || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>לחץ על "המלצת מערכת" לקבלת המלצות</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAssignSupplier}
              disabled={!selectedSupplierId || assignSupplierMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {assignSupplierMutation.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              הקצה ספק ושלח לייצור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
