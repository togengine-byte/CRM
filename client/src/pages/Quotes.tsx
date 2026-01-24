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
  sizeQuantityId: number;
  quantity: number;
  notes?: string;
  productName?: string;
  sizeName?: string;
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
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedQuoteForSupplier, setSelectedQuoteForSupplier] = useState<number | null>(null);
  
  // Create quote form state
  const [createForm, setCreateForm] = useState({
    notes: "",
    items: [] as QuoteItem[],
  });
  const [selectedSizeQuantityId, setSelectedSizeQuantityId] = useState<string>("");
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

  const handleFindSupplier = (quoteId: number) => {
    setSelectedQuoteForSupplier(quoteId);
    setShowSupplierModal(true);
  };

  const handleAddItem = () => {
    if (!selectedSizeQuantityId || itemQuantity < 1) {
      toast.error("יש לבחור מוצר וכמות");
      return;
    }
    
    // Find product and size info for display
    let productName = "";
    let sizeName = "";
    for (const product of (products || []) as any[]) {
      for (const size of product.sizes || []) {
        const quantities = (size as any).quantities || product.quantities?.filter((q: any) => q.sizeId === size.id) || [];
        const sq = quantities.find((q: any) => q.id === parseInt(selectedSizeQuantityId));
        if (sq) {
          productName = product.name;
          sizeName = `${size.name} (${sq.quantity} יח')`;
          break;
        }
      }
      if (productName) break;
    }
    
    setCreateForm({
      ...createForm,
      items: [
        ...createForm.items,
        {
          sizeQuantityId: parseInt(selectedSizeQuantityId),
          quantity: itemQuantity,
          notes: itemNotes || undefined,
          productName,
          sizeName,
        },
      ],
    });
    setSelectedSizeQuantityId("");
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

  const getSizeQuantityName = (sizeQuantityId: number) => {
    for (const product of (products || []) as any[]) {
      for (const size of product.sizes || []) {
        const quantities = (size as any).quantities || product.quantities?.filter((q: any) => q.sizeId === size.id) || [];
        const sq = quantities.find((q: any) => q.id === sizeQuantityId);
        if (sq) {
          return `${product.name} - ${size.name} (${sq.quantity} יח')`;
        }
      }
    }
    return `מוצר #${sizeQuantityId}`;
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
          key="find-supplier"
          size="sm"
          variant="outline"
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
          onClick={(e) => {
            e.stopPropagation();
            handleFindSupplier(quote.id);
          }}
        >
          <Search className="ml-1 h-3 w-3" />
          בחר ספק
        </Button>,
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
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-t-0 rounded-t-none">
                      {/* Quote Details */}
                      {quoteDetails && expandedQuoteId === quote.id && (
                        <div className="space-y-4">
                          {/* Info Grid - Compact like Customers */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">לקוח</p>
                              <p className="font-medium">{quote.customerName || "-"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">תאריך</p>
                              <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString("he-IL")}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">סטטוס</p>
                              <div className="mt-1">{getStatusBadge(quote.status)}</div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">סה"כ</p>
                              <p className="font-medium text-lg">{quote.finalValue ? `₪${Number(quote.finalValue).toLocaleString()}` : "-"}</p>
                            </div>
                          </div>

                          {/* Items - Compact */}
                          {quoteDetails.items && quoteDetails.items.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">פריטים ({quoteDetails.items.length})</p>
                              <div className="space-y-2">
                                {quoteDetails.items.map((item: any, index: number) => {
                                  const fullName = item.productName || getSizeQuantityName(item.sizeQuantityId);
                                  const parts = fullName.split(' - ');
                                  const productName = parts[0] || fullName;
                                  const sizeName = parts[1] || '';
                                  return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium">{productName}</span>
                                        {sizeName && <Badge variant="outline" className="text-xs">{sizeName}</Badge>}
                                        <span className="text-muted-foreground">× {item.quantity}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.priceAtTimeOfQuote ? `₪${Number(item.priceAtTimeOfQuote).toLocaleString()}` : '-'}</span>
                                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Recommended Suppliers by Category */}
                          <SupplierRecommendationsByCategory 
                            quoteId={quote.id}
                            quoteItems={quoteDetails.items?.map((item: any) => ({
                              quoteItemId: item.id,
                              sizeQuantityId: item.sizeQuantityId,
                              quantity: item.quantity,
                              productName: item.productName || getSizeQuantityName(item.sizeQuantityId),
                            })) || []}
                            onSupplierSelected={() => refetch()}
                          />

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-3 border-t">
                            {getActionButtons(quote)}
                          </div>

                          {/* Attachments - Compact */}
                          {quoteDetails.attachments && quoteDetails.attachments.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">קבצים ({quoteDetails.attachments.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {quoteDetails.attachments.map((attachment: any) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-background rounded border hover:bg-muted transition-colors"
                                  >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{attachment.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rejection Reason - Compact */}
                          {quoteDetails.rejectionReason && (
                            <div className="p-3 bg-red-50 rounded border border-red-200">
                              <p className="text-sm"><span className="font-medium text-red-700">סיבת דחייה:</span> <span className="text-red-600">{quoteDetails.rejectionReason}</span></p>
                            </div>
                          )}

                          {/* History Toggle - Compact */}
                          <div className="pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHistory(!showHistory);
                              }}
                              className="text-muted-foreground h-8 px-2"
                            >
                              <History className="ml-1 h-3 w-3" />
                              {showHistory ? "הסתר היסטוריה" : "היסטוריה"}
                            </Button>

                            {showHistory && quoteHistory && (
                              <div className="mt-2 space-y-1">
                                {quoteHistory.map((version) => (
                                  <div
                                    key={version.id}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded border text-sm",
                                      version.id === quote.id
                                        ? "border-primary bg-primary/5"
                                        : "bg-background"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">v{version.version}</Badge>
                                      {version.id === quote.id && (
                                        <Badge variant="default" className="text-[10px] px-1">נוכחי</Badge>
                                      )}
                                      {getStatusBadge(version.status)}
                                    </div>
                                    <div className="text-muted-foreground">
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
                        </div>
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
                  <Select value={selectedSizeQuantityId} onValueChange={setSelectedSizeQuantityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מוצר וגודל" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) =>
                        product.sizes?.map((size: any) =>
                          size.quantities?.map((sq: any) => (
                            <SelectItem key={sq.id} value={sq.id.toString()}>
                              {product.name} - {size.name} ({sq.quantity} יח')
                            </SelectItem>
                          ))
                        )
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
                      <p className="font-medium">{item.productName || 'מוצר'} - {item.sizeName || 'גודל'}</p>
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
      {/* Supplier Selection Modal */}
      <SupplierSelectionModal 
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setSelectedQuoteForSupplier(null);
        }}
        quoteId={selectedQuoteForSupplier}
        onSupplierSelected={() => {
          setShowSupplierModal(false);
          setSelectedQuoteForSupplier(null);
          refetch();
        }}
      />
    </div>
  );
}

// ==================== SUPPLIER SELECTION MODAL ====================

interface SupplierRecommendation {
  supplierId: number;
  supplierName: string;
  companyName?: string | null;
  pricePerUnit?: number;
  deliveryDays?: number;
  rating?: number;
  reliabilityScore?: number;
  totalScore?: number;
  price?: number;
  avgRating?: number;
  avgDeliveryDays?: number;
  score?: number;
}

function SupplierSelectionModal({ 
  isOpen, 
  onClose, 
  quoteId,
  onSupplierSelected
}: { 
  isOpen: boolean; 
  onClose: () => void;
  quoteId: number | null;
  onSupplierSelected: () => void;
}) {
  const { data: quoteDetails } = trpc.quotes.getById.useQuery(
    { id: quoteId! },
    { enabled: isOpen && !!quoteId }
  );

  // Get first sizeQuantityId from quote items to find product
  const sizeQuantityId = quoteDetails?.items?.[0]?.sizeQuantityId;

  const { data: recommendations, isLoading } = trpc.suppliers.enhancedRecommendations.useQuery(
    { productId: undefined, limit: 5 },
    { enabled: isOpen && !!sizeQuantityId }
  );

  const assignSupplierMutation = trpc.quotes.assignSupplier.useMutation({
    onSuccess: () => {
      toast.success("ספק נבחר בהצלחה!");
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בבחירת ספק: ${error.message}`);
    },
  });

  const handleSelectSupplier = (supplierId: number) => {
    if (quoteId) {
      assignSupplierMutation.mutate({
        quoteId,
        supplierId,
      });
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { color: 'bg-emerald-50 text-emerald-700', label: 'מומלץ מאוד' };
    if (score >= 60) return { color: 'bg-blue-50 text-blue-700', label: 'מומלץ' };
    return { color: 'bg-slate-100 text-slate-600', label: 'סביר' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Factory className="h-5 w-5 text-purple-600" />
            בחירת ספק להצעה #{quoteId}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            הספקים המתאימים ביותר על פי מחיר, איכות ואמינות
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 w-full rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">לא נמצאו ספקים מתאימים</p>
            </div>
          ) : (
            recommendations.map((supplier: SupplierRecommendation, index: number) => {
              const score = supplier.totalScore || supplier.score || 0;
              const scoreBadge = getScoreBadge(score);
              return (
                <div 
                  key={supplier.supplierId}
                  className={`p-4 rounded-lg border transition-all ${
                    index === 0 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-semibold ${
                        index === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{supplier.supplierName}</p>
                        {supplier.companyName && (
                          <p className="text-xs text-slate-500">{supplier.companyName}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${scoreBadge.color} border-0 text-xs`}>
                      {scoreBadge.label}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">מחיר</p>
                      <p className="text-sm font-semibold text-slate-900">₪{supplier.pricePerUnit || supplier.price || 0}</p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">דירוג</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center justify-center gap-1">
                        {(supplier.rating || supplier.avgRating || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">אספקה</p>
                      <p className="text-sm font-semibold text-slate-900">{supplier.deliveryDays || supplier.avgDeliveryDays || 0} ימים</p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">אמינות</p>
                      <p className="text-sm font-semibold text-slate-900">{supplier.reliabilityScore || 0}%</p>
                    </div>
                  </div>
                  
                  <Button 
                    className={`w-full ${
                      index === 0 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-slate-600 hover:bg-slate-700 text-white'
                    }`}
                    onClick={() => handleSelectSupplier(supplier.supplierId)}
                    disabled={assignSupplierMutation.isPending}
                  >
                    {assignSupplierMutation.isPending ? 'בוחר...' : 'בחר ספק זה'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ==================== SUPPLIER RECOMMENDATIONS BY CATEGORY ====================

interface CategoryRecommendation {
  categoryId: number;
  categoryName: string;
  items: {
    quoteItemId: number;
    sizeQuantityId: number;
    productName: string;
    quantity: number;
  }[];
  suppliers: {
    supplierId: number;
    supplierName: string;
    supplierCompany: string | null;
    avgRating: number;
    totalPrice: number;
    avgDeliveryDays: number;
    reliabilityPct: number;
    totalScore: number;
    rank: number;
    canFulfill: {
      quoteItemId: number;
      sizeQuantityId: number;
      pricePerUnit: number;
      deliveryDays: number;
    }[];
  }[];
}

interface ConfirmSupplierData {
  categoryId: number;
  categoryName: string;
  supplier: CategoryRecommendation['suppliers'][0];
  items: CategoryRecommendation['items'];
}

function SupplierRecommendationsByCategory({ 
  quoteId,
  quoteItems,
  onSupplierSelected 
}: { 
  quoteId: number;
  quoteItems: { quoteItemId: number; sizeQuantityId: number; quantity: number; productName: string }[];
  onSupplierSelected: () => void;
}) {
  const [confirmData, setConfirmData] = useState<ConfirmSupplierData | null>(null);

  const { data: recommendations, isLoading } = trpc.suppliers.recommendationsByCategory.useQuery(
    { quoteItems },
    { enabled: quoteItems.length > 0 }
  );

  const assignMutation = trpc.suppliers.assignToCategory.useMutation({
    onSuccess: () => {
      toast.success(`העבודה הועברה לספק בהצלחה!`);
      setConfirmData(null);
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בהעברה לספק: ${error.message}`);
    },
  });

  const handleConfirmSupplier = () => {
    if (confirmData) {
      assignMutation.mutate({
        quoteId,
        supplierId: confirmData.supplier.supplierId,
        items: confirmData.supplier.canFulfill,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-background rounded border">
        <p className="text-sm text-muted-foreground mb-2">טוען ספקים מומלצים...</p>
        <div className="space-y-2">
          <div className="h-16 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-3 bg-background rounded border">
        <p className="text-sm text-muted-foreground">לא נמצאו ספקים מומלצים למוצרים בהצעה</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {(recommendations as CategoryRecommendation[]).map((category) => (
          <div key={category.categoryId} className="p-3 bg-background rounded border">
            {/* Category Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{category.categoryName}</p>
                <p className="text-xs text-muted-foreground">
                  {category.items.map(i => i.productName).join(', ')}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {category.items.length} פריטים
              </Badge>
            </div>

            {/* Suppliers for this category */}
            {category.suppliers.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין ספקים זמינים לתחום זה</p>
            ) : (
              <div className="flex gap-2">
                {category.suppliers.map((supplier, index) => (
                  <button
                    key={supplier.supplierId}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmData({
                        categoryId: category.categoryId,
                        categoryName: category.categoryName,
                        supplier,
                        items: category.items,
                      });
                    }}
                    className={cn(
                      "flex-1 p-2 rounded border text-right transition-all hover:shadow-sm",
                      index === 0 
                        ? "bg-green-50 border-green-200 hover:border-green-300" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <p className="font-medium text-sm truncate">{supplier.supplierName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">⭐ {supplier.avgRating.toFixed(1)}</span>
                      <span className="text-xs font-medium">₪{supplier.totalPrice.toLocaleString()}</span>
                    </div>
                    {index === 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 bg-green-100 text-green-700 border-green-200">
                        מומלץ
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmData} onOpenChange={() => setConfirmData(null)}>
        <DialogContent className="sm:max-w-[450px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>העברת עבודה לספק</DialogTitle>
            <DialogDescription>
              האם להעביר את העבודה לספק <strong>{confirmData?.supplier.supplierName}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          {confirmData && (
            <div className="space-y-3">
              {/* Supplier Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ספק:</span>
                  <span className="font-medium">{confirmData.supplier.supplierName}</span>
                </div>
                {confirmData.supplier.supplierCompany && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">חברה:</span>
                    <span className="font-medium">{confirmData.supplier.supplierCompany}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">דירוג:</span>
                  <span className="font-medium">⭐ {confirmData.supplier.avgRating.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">זמן אספקה:</span>
                  <span className="font-medium">{confirmData.supplier.avgDeliveryDays} ימים</span>
                </div>
              </div>

              {/* Items to transfer */}
              <div>
                <p className="text-sm font-medium mb-2">פריטים להעברה:</p>
                <div className="space-y-1">
                  {confirmData.items.map((item) => {
                    const fulfillInfo = confirmData.supplier.canFulfill.find(
                      f => f.quoteItemId === item.quoteItemId
                    );
                    return (
                      <div key={item.quoteItemId} className="flex justify-between text-sm p-2 bg-background rounded border">
                        <span>{item.productName} × {item.quantity}</span>
                        <span className="font-medium">₪{fulfillInfo?.pricePerUnit || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="font-medium">סה"כ לתחום:</span>
                <span className="font-bold text-lg">₪{confirmData.supplier.totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmData(null)}>
              ביטול
            </Button>
            <Button 
              onClick={handleConfirmSupplier}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? "מעביר..." : "אשר והעבר לספק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
