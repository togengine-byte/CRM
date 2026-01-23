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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Pencil,
  Copy,
  CheckCircle,
  XCircle,
  Send,
  Factory,
  Package,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "superseded" | "in_production" | "ready";

interface QuoteItem {
  productVariantId: number;
  quantity: number;
  notes?: string;
}

export default function Quotes() {
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<QuoteStatus>("draft");
  const [rejectReason, setRejectReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  
  // Create quote form state
  const [createForm, setCreateForm] = useState({
    notes: "",
    items: [] as QuoteItem[],
  });
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: quotes, isLoading, refetch } = trpc.quotes.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId }
  );

  const { data: quoteHistory } = trpc.quotes.history.useQuery(
    { id: expandedQuoteId! },
    { enabled: !!expandedQuoteId && showHistory }
  );

  const { data: products } = trpc.products.list.useQuery({});

  const createMutation = trpc.quotes.request.useMutation({
    onSuccess: () => {
      toast.success("בקשת הצעת מחיר נשלחה בהצלחה");
      refetch();
      setIsCreateDialogOpen(false);
      setCreateForm({ notes: "", items: [] });
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת הצעת מחיר: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("סטטוס ההצעה עודכן");
      refetch();
      utils.quotes.getById.refetch();
      setIsStatusDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הסטטוס: ${error.message}`);
    },
  });

  const rejectMutation = trpc.quotes.reject.useMutation({
    onSuccess: () => {
      toast.success("ההצעה נדחת");
      refetch();
      utils.quotes.getById.refetch();
      setIsStatusDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(`שגיאה בדחיית ההצעה: ${error.message}`);
    },
  });

  const reviseMutation = trpc.quotes.revise.useMutation({
    onSuccess: () => {
      toast.success("גרסה חדשה נוצרה");
      refetch();
      utils.quotes.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת גרסה חדשה: ${error.message}`);
    },
  });

  const handleRowClick = (quoteId: number) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null);
      setShowHistory(false);
    } else {
      setExpandedQuoteId(quoteId);
      setShowHistory(false);
    }
  };

  const handleOpenStatusDialog = (quoteId: number, status: QuoteStatus) => {
    setSelectedQuoteId(quoteId);
    setNewStatus(status);
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = () => {
    if (selectedQuoteId) {
      if (newStatus === "rejected") {
        rejectMutation.mutate({
          quoteId: selectedQuoteId,
          reason: rejectReason,
        });
      } else {
        updateStatusMutation.mutate({
          quoteId: selectedQuoteId,
          status: newStatus,
        });
      }
    }
  };

  const handleCreateRevision = (quoteId: number) => {
    reviseMutation.mutate({
      quoteId: quoteId,
    });
  };

  const handleAddItem = () => {
    if (!selectedVariantId || itemQuantity < 1) {
      toast.error("יש לבחור מוצר וכמות");
      return;
    }
    
    setCreateForm({
      ...createForm,
      items: [
        ...createForm.items,
        {
          productVariantId: parseInt(selectedVariantId),
          quantity: itemQuantity,
          notes: itemNotes || undefined,
        },
      ],
    });
    setSelectedVariantId("");
    setItemQuantity(1);
    setItemNotes("");
  };

  const handleRemoveItem = (index: number) => {
    setCreateForm({
      ...createForm,
      items: createForm.items.filter((_, i) => i !== index),
    });
  };

  const handleCreateQuote = () => {
    if (createForm.items.length === 0) {
      toast.error("יש להוסיף לפחות פריט אחד");
      return;
    }
    createMutation.mutate({
      items: createForm.items,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Pencil className="ml-1 h-3 w-3" />
            טיוטה
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Send className="ml-1 h-3 w-3" />
            נשלחה
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="ml-1 h-3 w-3" />
            אושרה
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="ml-1 h-3 w-3" />
            נדחתה
          </Badge>
        );
      case "superseded":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Copy className="ml-1 h-3 w-3" />
            הוחלפה
          </Badge>
        );
      case "in_production":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Factory className="ml-1 h-3 w-3" />
            בייצור
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
            <Package className="ml-1 h-3 w-3" />
            מוכנה
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVariantName = (variantId: number) => {
    for (const product of products || []) {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        return `${product.name} - ${variant.name}`;
      }
    }
    return `וריאנט #${variantId}`;
  };

  // Filter quotes by search
  const filteredQuotes = quotes?.filter((quote) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      quote.id.toString().includes(search) ||
      quote.customerName?.toLowerCase().includes(search)
    );
  });

  // Get action buttons based on status
  const getActionButtons = (quote: typeof filteredQuotes extends (infer T)[] | undefined ? T : never) => {
    const buttons: React.ReactNode[] = [];

    if (quote.status === "draft") {
      buttons.push(
        <Button
          key="send"
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenStatusDialog(quote.id, "sent");
          }}
        >
          <Send className="ml-1 h-3 w-3" />
          שלח ללקוח
        </Button>
      );
    }

    if (quote.status === "sent") {
      buttons.push(
        <Button
          key="email"
          size="sm"
          variant="outline"
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
          onClick={(e) => {
            e.stopPropagation();
            toast.info("שלח למייל - פונקציה זמינה כשיוזן מפתח Google API בהגדרות");
          }}
        >
          <Send className="ml-1 h-3 w-3" />
          שלח למייל
        </Button>,
        <Button
          key="approve"
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenStatusDialog(quote.id, "approved");
          }}
        >
          <CheckCircle className="ml-1 h-3 w-3" />
          אשר
        </Button>,
        <Button
          key="reject"
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenStatusDialog(quote.id, "rejected");
          }}
        >
          <XCircle className="ml-1 h-3 w-3" />
          דחה
        </Button>
      );
    }

    if (quote.status === "approved") {
      buttons.push(
        <Button
          key="production"
          size="sm"
          variant="outline"
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenStatusDialog(quote.id, "in_production");
          }}
        >
          <Factory className="ml-1 h-3 w-3" />
          העבר לייצור
        </Button>
      );
    }

    if (quote.status === "in_production") {
      buttons.push(
        <Button
          key="ready"
          size="sm"
          variant="outline"
          className="text-teal-600 border-teal-200 hover:bg-teal-50"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenStatusDialog(quote.id, "ready");
          }}
        >
          <Package className="ml-1 h-3 w-3" />
          סמן כמוכן
        </Button>
      );
    }

    buttons.push(
      <Button
        key="revise"
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          handleCreateRevision(quote.id);
        }}
      >
        <Copy className="ml-1 h-3 w-3" />
        גרסה חדשה
      </Button>
    );

    return buttons;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">הצעות מחיר</h1>
          <p className="text-muted-foreground">ניהול ומעקב אחר הצעות מחיר</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הצעת מחיר חדשה
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי מספר הצעה או שם לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as QuoteStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="סינון לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="sent">נשלחה</SelectItem>
                <SelectItem value="approved">אושרה</SelectItem>
                <SelectItem value="rejected">נדחתה</SelectItem>
                <SelectItem value="in_production">בייצור</SelectItem>
                <SelectItem value="ready">מוכנה</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              רשימת הצעות מחיר
            </CardTitle>
            {filteredQuotes && filteredQuotes.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal">
                {filteredQuotes.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQuotes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין הצעות מחיר</h3>
              <p className="text-muted-foreground mt-1">לא נמצאו הצעות מחיר התואמות לחיפוש</p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                צור הצעת מחיר ראשונה
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuotes?.map((quote) => (
                <Collapsible
                  key={quote.id}
                  open={expandedQuoteId === quote.id}
                  onOpenChange={() => handleRowClick(quote.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                        expandedQuoteId === quote.id
                          ? "bg-accent border-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          {expandedQuoteId === quote.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-bold text-lg">#{quote.id}</span>
                        </div>
                        <div>
                          <p className="font-medium">{quote.customerName || "לקוח לא מזוהה"}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(quote.createdAt).toLocaleDateString("he-IL")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(quote.status)}
                        <Badge variant="outline">v{quote.version}</Badge>
                        <span className="font-bold text-lg min-w-[80px] text-left">
                          {quote.finalValue ? `₪${Number(quote.finalValue).toLocaleString()}` : "-"}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-t-0 rounded-t-none space-y-4">
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pb-4 border-b">
                        {getActionButtons(quote)}
                      </div>

                      {/* Quote Details */}
                      {quoteDetails && expandedQuoteId === quote.id && (
                        <>
                          {/* Items */}
                          {quoteDetails.items && quoteDetails.items.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                פריטים בהצעה
                              </h4>
                              <div className="grid gap-2">
                                {quoteDetails.items.map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center p-3 bg-background rounded-lg border"
                                  >
                                    <div>
                                      <p className="font-medium">{getVariantName(item.productVariantId)}</p>
                                      <p className="text-sm text-muted-foreground">כמות: {item.quantity}</p>
                                    </div>
                                    {item.priceAtTimeOfQuote && (
                                      <span className="font-medium">
                                        ₪{Number(item.priceAtTimeOfQuote).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Attachments */}
                          {quoteDetails.attachments && quoteDetails.attachments.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                קבצים מצורפים
                              </h4>
                              <div className="grid gap-2">
                                {quoteDetails.attachments.map((attachment: { id: number; fileName: string; fileUrl: string; uploadedAt: string }) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 bg-background rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{attachment.fileName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(attachment.uploadedAt).toLocaleDateString('he-IL')}
                                        </p>
                                      </div>
                                    </div>
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {quoteDetails.rejectionReason && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-sm font-medium text-red-700 mb-1">סיבת דחייה:</p>
                              <p className="text-sm text-red-600">{quoteDetails.rejectionReason}</p>
                            </div>
                          )}

                          {/* History Toggle */}
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHistory(!showHistory);
                              }}
                              className="text-muted-foreground"
                            >
                              <History className="ml-1 h-4 w-4" />
                              {showHistory ? "הסתר היסטוריה" : "הצג היסטוריית גרסאות"}
                            </Button>

                            {showHistory && quoteHistory && (
                              <div className="mt-3 space-y-2">
                                {quoteHistory.map((version) => (
                                  <div
                                    key={version.id}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-lg border",
                                      version.id === quote.id
                                        ? "border-primary bg-primary/5"
                                        : "bg-background"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline">v{version.version}</Badge>
                                      {version.id === quote.id && (
                                        <Badge variant="default" className="text-xs">נוכחי</Badge>
                                      )}
                                      {getStatusBadge(version.status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(version.createdAt).toLocaleDateString("he-IL")}
                                      {version.finalValue && (
                                        <span className="mr-2 font-medium text-foreground">
                                          ₪{Number(version.finalValue).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Quote Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>הצעת מחיר חדשה</DialogTitle>
            <DialogDescription>הוסף פריטים ליצירת הצעת מחיר</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Add Item Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">הוסף פריט</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>מוצר</Label>
                  <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מוצר" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) =>
                        product.variants?.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id.toString()}>
                            {product.name} - {variant.name} ({variant.sku})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>כמות</Label>
                  <Input
                    type="number"
                    min={1}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>הערות לפריט</Label>
                  <Input
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="אופציונלי"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={handleAddItem} className="w-full">
                <Plus className="ml-2 h-4 w-4" />
                הוסף לרשימה
              </Button>
            </div>

            {/* Items List */}
            {createForm.items.length > 0 && (
              <div className="space-y-2">
                <Label>פריטים בהצעה ({createForm.items.length})</Label>
                {createForm.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{getVariantName(item.productVariantId)}</p>
                      <p className="text-sm text-muted-foreground">
                        כמות: {item.quantity}
                        {item.notes && ` | ${item.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">הערות כלליות</Label>
              <Textarea
                id="notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="הערות להצעת המחיר..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateQuote} disabled={createMutation.isPending}>
              {createMutation.isPending ? "יוצר..." : "צור הצעת מחיר"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {newStatus === "rejected" ? "דחיית הצעה" : "עדכון סטטוס"}
            </DialogTitle>
            <DialogDescription>
              {newStatus === "rejected"
                ? "האם אתה בטוח שברצונך לדחות הצעה זו?"
                : `האם לעדכן את הסטטוס?`}
            </DialogDescription>
          </DialogHeader>
          {newStatus === "rejected" && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rejectReason">סיבת הדחייה</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="הזן סיבה לדחייה..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant={newStatus === "rejected" ? "destructive" : "default"}
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending || rejectMutation.isPending}
            >
              {updateStatusMutation.isPending || rejectMutation.isPending
                ? "מעדכן..."
                : "אישור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
