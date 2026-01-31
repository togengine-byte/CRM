import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  RefreshCw,
  User,
  Calendar,
  Coins,
  Send,
  Mail,
  FileText,
  AlertCircle,
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
  totalSupplierCost: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
}

export default function PendingApproval() {
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Get quotes with 'sent' status (sent to customer, pending approval)
  const { data: quotes, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: "sent",
  });

  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId }
  );

  // Resend to customer mutation
  const resendMutation = trpc.quotePricing.sendToCustomer.useMutation({
    onSuccess: () => {
      toast.success("ההצעה נשלחה שוב ללקוח");
      refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בשליחה: ${error.message}`);
    },
  });

  const handleRowClick = (quoteId: number) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null);
    } else {
      setExpandedQuoteId(quoteId);
    }
  };

  const handleResend = (quoteId: number) => {
    resendMutation.mutate({ quoteId });
  };

  // Calculate days waiting
  const getDaysWaiting = (updatedAt: string | Date) => {
    const updated = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-600" />
            ממתין לאישור לקוח
          </h1>
          <p className="text-muted-foreground">הצעות מחיר שנשלחו ללקוחות וממתינות לאישור</p>
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
                <p className="text-sm text-muted-foreground">ממתינות לאישור</p>
                <p className="text-2xl font-bold text-amber-600">
                  {quotes?.length || 0}
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
                <p className="text-sm text-muted-foreground">ממתינות יותר מ-3 ימים</p>
                <p className="text-2xl font-bold text-red-600">
                  {quotes?.filter(q => getDaysWaiting(q.updatedAt) > 3).length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שווי כולל</p>
                <p className="text-2xl font-bold text-green-600">
                  ₪{quotes?.reduce((sum, q) => sum + Number(q.finalValue || 0), 0).toLocaleString() || 0}
                </p>
              </div>
              <Coins className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-600" />
            הצעות שנשלחו ללקוחות
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
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין הצעות ממתינות</h3>
              <p className="text-muted-foreground mt-1">כל ההצעות שנשלחו כבר קיבלו תשובה</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">נשלח בתאריך</TableHead>
                  <TableHead className="text-right">ימים בהמתנה</TableHead>
                  <TableHead className="text-right">סה״כ</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote) => {
                  const daysWaiting = getDaysWaiting(quote.updatedAt.toString());
                  return (
                    <>
                      <TableRow
                        key={quote.id}
                        onClick={() => handleRowClick(quote.id)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>{quote.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{quote.customerName || "לקוח לא מזוהה"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(quote.updatedAt).toLocaleDateString("he-IL")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={daysWaiting > 3 ? "destructive" : daysWaiting > 1 ? "secondary" : "outline"}
                            className={cn(
                              daysWaiting > 3 && "bg-red-100 text-red-700 border-red-200",
                              daysWaiting > 1 && daysWaiting <= 3 && "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {daysWaiting} ימים
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ₪{Number(quote.finalValue || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResend(quote.id);
                            }}
                            disabled={resendMutation.isPending}
                          >
                            <Send className="h-4 w-4 ml-1" />
                            שלח שוב
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Details Row */}
                      {expandedQuoteId === quote.id && quoteDetails && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="p-4 space-y-4">
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
                                  <p className="text-sm text-muted-foreground">עלות ספקים</p>
                                  <p className="font-medium">₪{Number(quote.totalSupplierCost || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">רווח צפוי</p>
                                  <p className="font-medium text-green-600">
                                    ₪{(Number(quote.finalValue || 0) - Number(quote.totalSupplierCost || 0)).toLocaleString()}
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
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{item.productName || `פריט ${item.sizeQuantityId}`}</span>
                                          <span className="text-muted-foreground">× {item.quantity}</span>
                                        </div>
                                        <span className="font-medium">₪{Number(item.priceAtTimeOfQuote || 0).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
