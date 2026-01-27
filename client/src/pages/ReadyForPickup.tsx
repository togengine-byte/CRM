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
  PackageCheck,
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  Truck,
  MapPin,
  Phone,
  FileText,
  Building,
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
  supplierName?: string;
}

interface Quote {
  id: number;
  customerId: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  status: string;
  version: number;
  finalValue: string | null;
  totalSupplierCost: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItem[];
}

export default function ReadyForPickup() {
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Get quotes with 'ready' status (ready for pickup/delivery)
  const { data: quotes, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: "ready",
  });

  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId }
  );

  const handleRowClick = (quoteId: number) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null);
    } else {
      setExpandedQuoteId(quoteId);
    }
  };

  // Note: "delivered" status doesn't exist yet in the schema
  // For now, we'll just show a toast message
  const handleMarkDelivered = (quoteId: number) => {
    toast.success("ההזמנה סומנה כנמסרה - נדרש להוסיף סטטוס delivered לסכמה");
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-green-600" />
            ממתין לאיסוף
          </h1>
          <p className="text-muted-foreground">הזמנות שהייצור הסתיים וממתינות לאיסוף ומשלוח ללקוח</p>
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
                <p className="text-sm text-muted-foreground">ממתינות לאיסוף</p>
                <p className="text-2xl font-bold text-green-600">
                  {quotes?.length || 0}
                </p>
              </div>
              <PackageCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שווי כולל</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₪{quotes?.reduce((sum, q) => sum + Number(q.finalValue || 0), 0).toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">לקוחות ממתינים</p>
                <p className="text-2xl font-bold text-amber-600">
                  {new Set(quotes?.map(q => q.customerId)).size || 0}
                </p>
              </div>
              <User className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Truck className="h-4 w-4 text-green-600" />
            הזמנות מוכנות לאיסוף
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
              <PackageCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין הזמנות ממתינות</h3>
              <p className="text-muted-foreground mt-1">כל ההזמנות המוכנות כבר נאספו</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">תאריך מוכנות</TableHead>
                  <TableHead className="text-right">סה״כ</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote) => (
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
                      <TableCell className="font-bold text-green-600">
                        ₪{Number(quote.finalValue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDelivered(quote.id);
                          }}
                          disabled={false}
                        >
                          <Truck className="h-4 w-4 ml-1" />
                          סמן כנמסר
                        </Button>
                      </TableCell>
                    </TableRow>
                    {/* Expanded Details Row */}
                    {expandedQuoteId === quote.id && quoteDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5}>
                          <div className="p-4 space-y-4">
                            {/* Customer & Delivery Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">לקוח</p>
                                <p className="font-medium">{quote.customerName || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">טלפון</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {(quote as any).customerPhone || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">כתובת למשלוח</p>
                                <p className="font-medium flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {(quote as any).customerAddress || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">סה״כ לגבייה</p>
                                <p className="font-bold text-green-600">₪{Number(quote.finalValue || 0).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Items with Supplier Info */}
                            {quoteDetails.items && quoteDetails.items.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">פריטים לאיסוף ({quoteDetails.items.length})</p>
                                <div className="space-y-2">
                                  {quoteDetails.items.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                                      <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{item.productName || `פריט ${item.sizeQuantityId}`}</span>
                                        <span className="text-muted-foreground">× {item.quantity}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {item.supplierName && (
                                          <Badge variant="outline" className="flex items-center gap-1">
                                            <Building className="h-3 w-3" />
                                            {item.supplierName}
                                          </Badge>
                                        )}
                                        <span className="font-medium">₪{Number(item.priceAtTimeOfQuote || 0).toLocaleString()}</span>
                                      </div>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
