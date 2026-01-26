/**
 * Customer Portal Preview
 * 
 * This page allows admins to preview the customer portal experience.
 * It simulates what a customer sees when they log in.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  RefreshCw,
  Download,
  User,
  AlertTriangle,
  Info,
} from "lucide-react";

type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "superseded" | "in_production" | "ready";

interface QuoteItem {
  id: number;
  sizeQuantityId: number;
  quantity: number;
  priceAtTimeOfQuote: string;
  isUpsell: boolean | null;
  productName?: string | null;
  sizeName?: string | null;
  dimensions?: string | null;
  sizeQuantity?: number | null;
}

interface Quote {
  id: number;
  status: QuoteStatus;
  version: number;
  finalValue: string | null;
  createdAt: string | Date;
  parentQuoteId?: number | null;
  items?: QuoteItem[];
  customerName?: string;
}

export default function CustomerPortalPreview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const utils = trpc.useUtils();

  // Get all customers for selection
  const { data: customers } = trpc.customers.list.useQuery({});

  // Get all quotes (admin view)
  const { data: allQuotes = [], isLoading, refetch } = trpc.quotes.list.useQuery({});

  // Filter quotes by selected customer
  const quotes = selectedCustomerId 
    ? allQuotes.filter((q: any) => q.customerId === parseInt(selectedCustomerId))
    : allQuotes;

  // Get quote details
  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: selectedQuoteId! },
    { enabled: !!selectedQuoteId && isDetailsOpen }
  );

  // Calculate stats for selected customer
  const stats = {
    total: quotes.length,
    pending: quotes.filter((q: any) => q.status === "sent").length,
    approved: quotes.filter((q: any) => q.status === "approved").length,
    inProduction: quotes.filter((q: any) => q.status === "in_production").length,
    ready: quotes.filter((q: any) => q.status === "ready").length,
  };

  const handleViewDetails = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const statusConfig: Record<QuoteStatus, { label: string; className: string; icon: React.ReactNode }> = {
      draft: { label: "טיוטה", className: "bg-gray-100 text-gray-800 border-gray-200", icon: <FileText className="h-3 w-3" /> },
      sent: { label: "ממתין לאישור", className: "bg-blue-100 text-blue-800 border-blue-200", icon: <Clock className="h-3 w-3" /> },
      approved: { label: "אושר", className: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: "נדחה", className: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3 w-3" /> },
      superseded: { label: "הוחלף", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <RefreshCw className="h-3 w-3" /> },
      in_production: { label: "בייצור", className: "bg-purple-100 text-purple-800 border-purple-200", icon: <Package className="h-3 w-3" /> },
      ready: { label: "מוכן לאיסוף", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800", icon: null };

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const canApproveOrReject = (status: QuoteStatus) => status === "sent";

  // Simulate customer approve action
  const handleSimulateApprove = (quoteId: number) => {
    toast.success(`סימולציה: הצעה #${quoteId} אושרה על ידי הלקוח`);
    // In real scenario, this would call customerPortal.approveQuote
  };

  // Simulate customer reject action
  const handleSimulateReject = (quoteId: number) => {
    toast.info(`סימולציה: הצעה #${quoteId} נדחתה על ידי הלקוח`);
    setIsRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Admin Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">תצוגה מקדימה של פורטל לקוחות</p>
              <p className="text-sm text-amber-700">
                דף זה מציג את מה שהלקוח רואה כשהוא נכנס לפורטל שלו. בחר לקוח מהרשימה כדי לראות את ההצעות שלו.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            בחר לקוח לצפייה
          </CardTitle>
          <CardDescription>בחר לקוח כדי לראות את הפורטל מנקודת המבט שלו</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="בחר לקוח..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">כל הלקוחות</SelectItem>
              {customers?.map((customer: any) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name} {customer.companyName && `(${customer.companyName})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Header - Customer View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">הצעות המחיר שלי</h1>
          <p className="text-muted-foreground">
            {selectedCustomerId 
              ? `צפייה בהצעות של: ${customers?.find((c: any) => c.id === parseInt(selectedCustomerId))?.name || 'לקוח'}`
              : 'צפה ונהל את הצעות המחיר שלך'
            }
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ml-2 h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה"כ הצעות</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות לאישור</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">אושרו</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">בייצור</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inProduction}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">מוכנות</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי מספר הצעה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            הצעות מחיר
            {quotes && (
              <Badge variant="secondary" className="mr-2">
                {quotes.length} הצעות
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין הצעות מחיר</h3>
              <p className="text-muted-foreground mt-1">
                {selectedCustomerId ? 'ללקוח זה אין הצעות מחיר' : 'עדיין לא נוצרו הצעות מחיר'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מספר הצעה</TableHead>
                  {!selectedCustomerId && <TableHead className="text-right">לקוח</TableHead>}
                  <TableHead className="text-right">גרסה</TableHead>
                  <TableHead className="text-right">סכום</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes
                  .filter((quote: any) => 
                    !searchQuery || quote.id.toString().includes(searchQuery)
                  )
                  .map((quote: any) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.id}</TableCell>
                      {!selectedCustomerId && <TableCell>{quote.customerName || '-'}</TableCell>}
                      <TableCell>v{quote.version}</TableCell>
                      <TableCell>
                        {quote.finalValue ? `₪${parseFloat(quote.finalValue).toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(quote.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(quote.id)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            צפה
                          </Button>
                          {canApproveOrReject(quote.status) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleSimulateApprove(quote.id)}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                אשר
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedQuoteId(quote.id);
                                  setIsRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 ml-1" />
                                דחה
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle>פרטי הצעת מחיר {selectedQuoteId}</SheetTitle>
            <SheetDescription>
              צפה בפרטי ההצעה ובצע פעולות
            </SheetDescription>
          </SheetHeader>

          {quoteDetails && (
            <div className="mt-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סטטוס:</span>
                {getStatusBadge(quoteDetails.status as QuoteStatus)}
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">סיכום</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">גרסה:</span>
                    <span>v{quoteDetails.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">תאריך יצירה:</span>
                    <span>{new Date(quoteDetails.createdAt).toLocaleDateString("he-IL")}</span>
                  </div>
                  {quoteDetails.finalValue && (
                    <div className="flex justify-between text-lg font-bold">
                      <span>סה"כ:</span>
                      <span>₪{parseFloat(quoteDetails.finalValue).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              {quoteDetails.items && quoteDetails.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">פריטים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">פריט</TableHead>
                          <TableHead className="text-right">כמות</TableHead>
                          <TableHead className="text-right">מחיר</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quoteDetails.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName || 'מוצר'} - {item.sizeName || 'גודל'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₪{parseFloat(item.priceAtTimeOfQuote).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Attachments */}
              {quoteDetails.attachments && quoteDetails.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">קבצים מצורפים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {quoteDetails.attachments.map((attachment: any) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{attachment.fileName}</span>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {canApproveOrReject(quoteDetails.status as QuoteStatus) && (
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleSimulateApprove(selectedQuoteId!)}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    אשר הצעה
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setIsRejectDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 ml-2" />
                    דחה הצעה
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>דחיית הצעת מחיר</DialogTitle>
            <DialogDescription>
              אנא ציין את הסיבה לדחיית ההצעה (אופציונלי)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">סיבת דחייה</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="הזן סיבה לדחייה..."
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSimulateReject(selectedQuoteId!)}
            >
              <XCircle className="h-4 w-4 ml-2" />
              דחה הצעה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
