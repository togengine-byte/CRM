import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
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

interface SupplierRecommendation {
  supplierId: number;
  supplierName: string;
  supplierCompany?: string | null;
  supplierNumber?: number;
  rank: number;
  isNewSupplier?: boolean;
  scores: {
    totalScore: number;
  };
  metrics: {
    completedJobs: number;
    promiseKeeping: { percentage: number };
    currentLoad: number;
  };
}

export default function CustomerApproved() {
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const [selectedSupplierByQuote, setSelectedSupplierByQuote] = useState<Record<number, string>>({});
  const [showRecommendationsByQuote, setShowRecommendationsByQuote] = useState<Record<number, boolean>>({});
  const [recommendationsByQuote, setRecommendationsByQuote] = useState<Record<number, SupplierRecommendation[]>>({});
  const [loadingRecommendations, setLoadingRecommendations] = useState<Record<number, boolean>>({});

  const utils = trpc.useUtils();

  // Get quotes with 'approved' status
  const { data: quotes, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: "approved",
  });

  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId }
  );

  // Get suppliers list
  const { data: suppliers } = trpc.suppliers.list.useQuery({});

  // Assign supplier mutation
  const assignSupplierMutation = trpc.quotes.assignSupplier.useMutation({
    onSuccess: (_, variables) => {
      toast.success("ספק הוקצה בהצלחה - ההצעה עברה לייצור");
      refetch();
      utils.quotes.getById.refetch();
      // Clear state for this quote
      setSelectedSupplierByQuote(prev => {
        const newState = { ...prev };
        delete newState[variables.quoteId];
        return newState;
      });
      setShowRecommendationsByQuote(prev => {
        const newState = { ...prev };
        delete newState[variables.quoteId];
        return newState;
      });
    },
    onError: (error) => {
      toast.error(`שגיאה בהקצאת ספק: ${error.message}`);
    },
  });

  // Move to production mutation
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
    setExpandedQuoteId(expandedQuoteId === quoteId ? null : quoteId);
  };

  const handleGetRecommendations = async (quoteId: number) => {
    setLoadingRecommendations(prev => ({ ...prev, [quoteId]: true }));
    setShowRecommendationsByQuote(prev => ({ ...prev, [quoteId]: true }));
    try {
      const result = await utils.suppliers.allRecommendations.fetch({});
      if (result && result.length > 0) {
        setRecommendationsByQuote(prev => ({ ...prev, [quoteId]: result }));
        setSelectedSupplierByQuote(prev => ({ ...prev, [quoteId]: result[0].supplierId.toString() }));
        toast.success(`נמצא ספק מומלץ: ${result[0].supplierName || result[0].supplierCompany}`);
      } else {
        toast.error("לא נמצאו ספקים מומלצים");
      }
    } catch (error) {
      toast.error("שגיאה בקבלת המלצות");
    } finally {
      setLoadingRecommendations(prev => ({ ...prev, [quoteId]: false }));
    }
  };

  const handleAssignSupplier = (quoteId: number) => {
    const supplierId = selectedSupplierByQuote[quoteId];
    if (supplierId) {
      assignSupplierMutation.mutate({
        quoteId,
        supplierId: parseInt(supplierId),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            אושר על ידי הלקוח
          </h1>
          <p className="text-muted-foreground">הצעות שאושרו על ידי הלקוח וממתינות לשליחה לייצור</p>
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
                  const isExpanded = expandedQuoteId === quote.id;
                  const showRecs = showRecommendationsByQuote[quote.id];
                  const recommendations = recommendationsByQuote[quote.id] || [];
                  const selectedSupplier = selectedSupplierByQuote[quote.id] || "";
                  const isLoadingRecs = loadingRecommendations[quote.id];

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
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details - Inline */}
                      {isExpanded && (
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
                              {quoteDetails?.items && quoteDetails.items.length > 0 && (
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

                              {/* Actions Section - Inline */}
                              <div className="border-t pt-4 space-y-4">
                                {hasAllSuppliers ? (
                                  /* All suppliers assigned - Show "Send to Production" button + option to change supplier */
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                      <Button
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleMoveToProduction(quote.id)}
                                        disabled={moveToProductionMutation.isPending}
                                      >
                                        {moveToProductionMutation.isPending ? (
                                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                        ) : (
                                          <Factory className="h-4 w-4 ml-2" />
                                        )}
                                        העבר לייצור
                                      </Button>
                                      <span className="text-sm text-muted-foreground">
                                        כל הפריטים כבר משוייכים לספק - ניתן להעביר ישירות לייצור
                                      </span>
                                    </div>
                                    
                                    {/* Option to change supplier */}
                                    <details className="group">
                                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                                        <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                                        רוצה להחליף ספק?
                                      </summary>
                                      <div className="mt-4 space-y-4 pr-6">
                                        <p className="text-sm font-medium">בחר ספק חדש לכל הפריטים:</p>
                                        
                                        {/* Two Options - Inline */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Manual Selection */}
                                          <Card 
                                            className={cn(
                                              "cursor-pointer transition-all border-2",
                                              !showRecs ? "border-purple-500 bg-purple-50/50" : "border-transparent hover:border-gray-300"
                                            )}
                                            onClick={() => setShowRecommendationsByQuote(prev => ({ ...prev, [quote.id]: false }))}
                                          >
                                            <CardContent className="pt-4">
                                              <div className="flex items-center gap-3">
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
                                          <Card 
                                            className={cn(
                                              "cursor-pointer transition-all border-2",
                                              showRecs ? "border-amber-500 bg-amber-50/50" : "border-transparent hover:border-gray-300"
                                            )}
                                            onClick={() => handleGetRecommendations(quote.id)}
                                          >
                                            <CardContent className="pt-4">
                                              <div className="flex items-center gap-3">
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
                                        {!showRecs && (
                                          <div className="space-y-2">
                                            <Select 
                                              value={selectedSupplier} 
                                              onValueChange={(value) => setSelectedSupplierByQuote(prev => ({ ...prev, [quote.id]: value }))}
                                            >
                                              <SelectTrigger className="w-full md:w-80">
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

                                        {/* System Recommendations Table */}
                                        {showRecs && (
                                          <div className="space-y-2">
                                            {isLoadingRecs ? (
                                              <div className="flex items-center justify-center py-4">
                                                <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
                                                <span className="mr-2 text-muted-foreground">מחשב המלצות...</span>
                                              </div>
                                            ) : recommendations.length > 0 ? (
                                              <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                  <thead className="bg-gray-50">
                                                    <tr>
                                                      <th className="px-3 py-2 text-right font-medium text-gray-600">#</th>
                                                      <th className="px-3 py-2 text-right font-medium text-gray-600">ספק</th>
                                                      <th className="px-3 py-2 text-center font-medium text-gray-600">ציון</th>
                                                      <th className="px-3 py-2 text-center font-medium text-gray-600">אמינות</th>
                                                      <th className="px-3 py-2 text-center font-medium text-gray-600">עבודות</th>
                                                      <th className="px-3 py-2 text-center font-medium text-gray-600">עומס</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {recommendations.slice(0, 5).map((rec, index) => (
                                                      <tr
                                                        key={rec.supplierId}
                                                        onClick={() => setSelectedSupplierByQuote(prev => ({ ...prev, [quote.id]: rec.supplierId.toString() }))}
                                                        className={cn(
                                                          "cursor-pointer transition-all border-b last:border-b-0",
                                                          selectedSupplier === rec.supplierId.toString()
                                                            ? "bg-amber-100"
                                                            : "hover:bg-amber-50"
                                                        )}
                                                      >
                                                        <td className="px-3 py-2">
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
                                                        <td className="px-3 py-2">
                                                          <div className="flex items-center gap-1">
                                                            <span className="font-medium">{rec.supplierName || rec.supplierCompany || `ספק #${rec.supplierId}`}</span>
                                                            {index === 0 && <Sparkles className="h-3 w-3 text-amber-500" />}
                                                          </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          <span className={cn("font-bold", getScoreColor(rec.scores?.totalScore || 0))}>
                                                            {Math.round(rec.scores?.totalScore || 0)}
                                                          </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-green-600">
                                                          {Math.round(rec.metrics?.promiseKeeping?.percentage || 0)}%
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                          {rec.metrics?.completedJobs || 0}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-blue-600">
                                                          {rec.metrics?.currentLoad || 0}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ) : (
                                              <div className="text-center py-4 text-muted-foreground">
                                                <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                                <p>לחץ על "המלצת מערכת" לקבלת המלצות</p>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Assign Button */}
                                        {selectedSupplier && (
                                          <Button
                                            size="lg"
                                            className="bg-purple-600 hover:bg-purple-700"
                                            onClick={() => handleAssignSupplier(quote.id)}
                                            disabled={assignSupplierMutation.isPending}
                                          >
                                            {assignSupplierMutation.isPending ? (
                                              <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                            ) : (
                                              <Send className="h-4 w-4 ml-2" />
                                            )}
                                            החלף ספק והעבר לייצור
                                          </Button>
                                        )}
                                      </div>
                                    </details>
                                  </div>
                                ) : (
                                  /* Need to select supplier - Show inline selection */
                                  <div className="space-y-4">
                                    <p className="text-sm font-medium">בחר ספק לכל הפריטים:</p>
                                    
                                    {/* Two Options - Inline */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Manual Selection */}
                                      <Card 
                                        className={cn(
                                          "cursor-pointer transition-all border-2",
                                          !showRecs ? "border-purple-500 bg-purple-50/50" : "border-transparent hover:border-gray-300"
                                        )}
                                        onClick={() => setShowRecommendationsByQuote(prev => ({ ...prev, [quote.id]: false }))}
                                      >
                                        <CardContent className="pt-4">
                                          <div className="flex items-center gap-3">
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
                                      <Card 
                                        className={cn(
                                          "cursor-pointer transition-all border-2",
                                          showRecs ? "border-amber-500 bg-amber-50/50" : "border-transparent hover:border-gray-300"
                                        )}
                                        onClick={() => handleGetRecommendations(quote.id)}
                                      >
                                        <CardContent className="pt-4">
                                          <div className="flex items-center gap-3">
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
                                    {!showRecs && (
                                      <div className="space-y-2">
                                        <Select 
                                          value={selectedSupplier} 
                                          onValueChange={(value) => setSelectedSupplierByQuote(prev => ({ ...prev, [quote.id]: value }))}
                                        >
                                          <SelectTrigger className="w-full md:w-80">
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

                                    {/* System Recommendations Table */}
                                    {showRecs && (
                                      <div className="space-y-2">
                                        {isLoadingRecs ? (
                                          <div className="flex items-center justify-center py-4">
                                            <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
                                            <span className="mr-2 text-muted-foreground">מחשב המלצות...</span>
                                          </div>
                                        ) : recommendations.length > 0 ? (
                                          <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th className="px-3 py-2 text-right font-medium text-gray-600">#</th>
                                                  <th className="px-3 py-2 text-right font-medium text-gray-600">ספק</th>
                                                  <th className="px-3 py-2 text-center font-medium text-gray-600">ציון</th>
                                                  <th className="px-3 py-2 text-center font-medium text-gray-600">אמינות</th>
                                                  <th className="px-3 py-2 text-center font-medium text-gray-600">עבודות</th>
                                                  <th className="px-3 py-2 text-center font-medium text-gray-600">עומס</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {recommendations.slice(0, 5).map((rec, index) => (
                                                  <tr
                                                    key={rec.supplierId}
                                                    onClick={() => setSelectedSupplierByQuote(prev => ({ ...prev, [quote.id]: rec.supplierId.toString() }))}
                                                    className={cn(
                                                      "cursor-pointer transition-all border-b last:border-b-0",
                                                      selectedSupplier === rec.supplierId.toString()
                                                        ? "bg-amber-100"
                                                        : "hover:bg-amber-50"
                                                    )}
                                                  >
                                                    <td className="px-3 py-2">
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
                                                    <td className="px-3 py-2">
                                                      <div className="flex items-center gap-1">
                                                        <span className="font-medium">{rec.supplierName || rec.supplierCompany || `ספק #${rec.supplierId}`}</span>
                                                        {index === 0 && <Sparkles className="h-3 w-3 text-amber-500" />}
                                                      </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                      <span className={cn("font-bold", getScoreColor(rec.scores?.totalScore || 0))}>
                                                        {Math.round(rec.scores?.totalScore || 0)}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-green-600">
                                                      {Math.round(rec.metrics?.promiseKeeping?.percentage || 0)}%
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                      {rec.metrics?.completedJobs || 0}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-blue-600">
                                                      {rec.metrics?.currentLoad || 0}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="text-center py-4 text-muted-foreground">
                                            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                            <p>לחץ על "המלצת מערכת" לקבלת המלצות</p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Assign Button */}
                                    {selectedSupplier && (
                                      <Button
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleAssignSupplier(quote.id)}
                                        disabled={assignSupplierMutation.isPending}
                                      >
                                        {assignSupplierMutation.isPending ? (
                                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4 ml-2" />
                                        )}
                                        הקצה ספק והעבר לייצור
                                      </Button>
                                    )}
                                  </div>
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
    </div>
  );
}
