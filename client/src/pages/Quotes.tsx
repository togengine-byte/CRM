import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DollarSign,
  Calculator,
  Clock,
  UserX,
  Loader2,
  Save,
  RotateCcw,
  Zap,
  Users,
  Upload,
  X,
  FileUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  
  // Pricing editor state
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [pricingQuoteId, setPricingQuoteId] = useState<number | null>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [selectedPricelistId, setSelectedPricelistId] = useState<number | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<number, { customerPrice: number; isManual: boolean }>>({});
  
  // Create quote form state
  const [createForm, setCreateForm] = useState({
    notes: "",
    items: [] as QuoteItem[],
    customerId: null as number | null,
    files: [] as File[],
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
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
  
  // Get customers list for selection
  const { data: customers } = trpc.customers.list.useQuery({});

  const createMutation = trpc.quotes.request.useMutation({
    onSuccess: () => {
      toast.success("הצעת מחיר נוצרה בהצלחה");
      refetch();
      setIsCreateDialogOpen(false);
      setCreateForm({ notes: "", items: [], customerId: null, files: [] });
      setCustomerSearch("");
      setProductSearch("");
      setSelectedProductId(null);
      setSelectedSizeId(null);
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

  // Pricing queries and mutations
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const { data: defaultPricelist } = trpc.quotePricing.getDefaultPricelist.useQuery();

  // Set default pricelist when loaded
  useEffect(() => {
    if (defaultPricelist && !selectedPricelistId) {
      setSelectedPricelistId(defaultPricelist.id);
    }
  }, [defaultPricelist, selectedPricelistId]);

  // Load pricelist when quote is expanded
  useEffect(() => {
    if (quoteDetails && expandedQuoteId) {
      // If quote has a pricelist, use it
      if (quoteDetails.pricelistId) {
        setSelectedPricelistId(quoteDetails.pricelistId);
      } else if (defaultPricelist) {
        // Otherwise use default pricelist
        setSelectedPricelistId(defaultPricelist.id);
      }
    }
  }, [quoteDetails, expandedQuoteId, defaultPricelist]);

  const autoPopulateMutation = trpc.quotePricing.autoPopulate.useMutation({
    onSuccess: (data) => {
      setPricingData(data);
      setSelectedPricelistId(data.pricelist?.id || null);
      setEditedPrices({});
      toast.success("מחירים נטענו אוטומטית");
    },
    onError: (error) => {
      toast.error(`שגיאה בטעינת מחירים: ${error.message}`);
    },
  });

  const changePricelistMutation = trpc.quotePricing.changePricelist.useMutation({
    onSuccess: (data) => {
      toast.success(`מחירון שונה ל-${data.pricelist.name}`);
      setPricingData(data);
      refetch();
      utils.quotes.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בשינוי מחירון: ${error.message}`);
    },
  });

  const updateItemMutation = trpc.quotePricing.updateItem.useMutation({
    onSuccess: () => {
      if (pricingQuoteId) {
        autoPopulateMutation.mutate({ quoteId: pricingQuoteId });
      }
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון מחיר: ${error.message}`);
    },
  });

  const sendToCustomerMutation = trpc.quotePricing.sendToCustomer.useMutation({
    onSuccess: () => {
      toast.success("הצעה נשלחה ללקוח בהצלחה");
      setIsPricingDialogOpen(false);
      setPricingData(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בשליחת ההצעה: ${error.message}`);
    },
  });

  // Cancel supplier mutation
  const cancelSupplierMutation = trpc.suppliers.cancelJobsByQuote.useMutation({
    onSuccess: () => {
      toast.success("הספק בוטל בהצלחה - ההצעה חזרה לממתין לספק");
      refetch();
      utils.quotes.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בביטול הספק: ${error.message}`);
    },
  });

  // Auto production toggle mutation
  const setAutoProductionMutation = trpc.quotes.setAutoProduction.useMutation({
    onSuccess: (data) => {
      toast.success(data.autoProduction 
        ? "העברה אוטומטית לייצור הופעלה" 
        : "העברה אוטומטית לייצור כבויה"
      );
      refetch();
      utils.quotes.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הגדרה: ${error.message}`);
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
      toast.error("יש לבחור מוצר, גודל וכמות");
      return;
    }
    
    // Find product and size info for display
    const product = (products || []).find((p: any) => p.id === selectedProductId);
    const size = product?.sizes?.find((s: any) => s.id === selectedSizeId);
    const sq = size?.quantities?.find((q: any) => q.id === parseInt(selectedSizeQuantityId));
    
    const productName = product?.name || '';
    const sizeName = size ? `${size.name} (${sq?.quantity || ''} יח')` : '';
    
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
    // Reset item selection
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedSizeQuantityId("");
    setProductSearch("");
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
    if (!createForm.customerId) {
      toast.error("יש לבחור לקוח");
      return;
    }
    createMutation.mutate({
      customerId: createForm.customerId,
      items: createForm.items,
    });
  };

  // Open pricing editor for a quote
  const handleOpenPricingEditor = (quoteId: number) => {
    setPricingQuoteId(quoteId);
    setIsPricingDialogOpen(true);
    setEditedPrices({});
    autoPopulateMutation.mutate({ quoteId });
  };

  // Handle pricelist change
  const handlePricelistChange = (pricelistId: string) => {
    const id = parseInt(pricelistId);
    setSelectedPricelistId(id);
    if (pricingQuoteId) {
      changePricelistMutation.mutate({ quoteId: pricingQuoteId, pricelistId: id });
    }
  };

  // Handle manual price edit
  const handlePriceEdit = (itemId: number, newPrice: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: { customerPrice: newPrice, isManual: true }
    }));
  };

  // Save edited price
  const handleSavePrice = (itemId: number) => {
    const edited = editedPrices[itemId];
    if (edited) {
      updateItemMutation.mutate({
        itemId,
        customerPrice: edited.customerPrice,
        isManualPrice: true,
      }, {
        onSuccess: () => {
          toast.success("מחיר נשמר בהצלחה");
          refetch();
          utils.quotes.getById.refetch();
          setEditedPrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[itemId];
            return newPrices;
          });
        }
      });
    }
  };

  // Reset price to automatic
  const handleResetPrice = (itemId: number) => {
    updateItemMutation.mutate({
      itemId,
      isManualPrice: false,
    }, {
      onSuccess: () => {
        toast.success("מחיר הוחזר לאוטומטי");
        refetch();
        utils.quotes.getById.refetch();
        setEditedPrices(prev => {
          const newPrices = { ...prev };
          delete newPrices[itemId];
          return newPrices;
        });
      }
    });
  };

  // Send quote to customer
  const handleSendToCustomer = () => {
    if (pricingQuoteId) {
      sendToCustomerMutation.mutate({ quoteId: pricingQuoteId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="ml-1 h-3 w-3" />
            ממתין לשליחה
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Send className="ml-1 h-3 w-3" />
            נשלח ללקוח
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="ml-1 h-3 w-3" />
            אושר - ממתין לספק
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="ml-1 h-3 w-3" />
            נדחה
          </Badge>
        );
      case "superseded":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Copy className="ml-1 h-3 w-3" />
            הוחלף
          </Badge>
        );
      case "in_production":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Factory className="ml-1 h-3 w-3" />
            עבר ליצור
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
            <Package className="ml-1 h-3 w-3" />
            מוכן
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
      // כפתורי התמחור ושליחה עכשיו בתוך הפאנל המורחב
      // כפתור גרסה חדשה בלבד
      buttons.push(
        <Button
          key="revise"
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateRevision(quote.id);
          }}
          disabled={reviseMutation.isPending}
        >
          <Copy className="ml-1 h-3 w-3" />
          גרסה חדשה
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
      // אחרי אישור לקוח - ממתין לספק
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
          בחר ספק ושלח
        </Button>
      );
      // אפשרות לבטל ספק אם הוא עדיין לא אישר (לא עבר ליצור)
      buttons.push(
        <Button
          key="cancel-supplier"
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("האם אתה בטוח שברצונך לבטל את הספק? ההצעה תחזור לממתין לשליחה.")) {
              cancelSupplierMutation.mutate({ quoteId: quote.id, reason: "ביטול על ידי המשתמש" });
            }
          }}
        >
          <UserX className="ml-1 h-3 w-3" />
          בטל ספק
        </Button>
      );
    }

    if (quote.status === "in_production") {
      // עבר ליצור - הספק כבר אישר, אי אפשר לבטל
      // הספק יסמן כמוכן בפורטל שלו
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">גרסה</TableHead>
                  <TableHead className="text-right">סה״כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes?.map((quote) => (
                  <>
                    <TableRow
                      key={quote.id}
                      onClick={() => handleRowClick(quote.id)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>{quote.id}</TableCell>
                      <TableCell className="font-medium">{quote.customerName || "לקוח לא מזוהה"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(quote.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">v{quote.version}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {quote.finalValue ? `₪${Number(quote.finalValue).toLocaleString()}` : "-"}
                      </TableCell>
                    </TableRow>
                    {/* Expanded Details Row */}
                    {expandedQuoteId === quote.id && quoteDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6}>
                          <div className="p-6 space-y-6">
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

                          {/* Step 1: Pricelist Selection */}
                          {quote.status === "draft" && (
                            <div className="p-3 bg-muted/30 rounded border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">1</span>
                                  <p className="text-sm font-medium">בחר מחירון</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={expandedQuoteId === quote.id ? (selectedPricelistId?.toString() || '') : ''}
                                    onValueChange={(value) => {
                                      const id = parseInt(value);
                                      setSelectedPricelistId(id);
                                      changePricelistMutation.mutate({ quoteId: quote.id, pricelistId: id });
                                    }}
                                  >
                                    <SelectTrigger className="w-[180px] h-8">
                                      <SelectValue placeholder="בחר מחירון" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {pricelists?.map((pl: any) => (
                                        <SelectItem key={pl.id} value={pl.id.toString()}>
                                          {pl.name} ({parseFloat(pl.markupPercentage || 0).toFixed(0)}%)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {selectedPricelistId && expandedQuoteId === quote.id && (
                                    <Badge variant="secondary" className="text-xs">
                                      רווח: {pricelists?.find((pl: any) => pl.id === selectedPricelistId)?.markupPercentage || 0}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Step 2: Supplier Selection (Algorithm) - Per Item */}
                          {quote.status === "draft" && (
                            <div className="p-3 bg-muted/30 rounded border">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">2</span>
                                <p className="text-sm font-medium">בחר ספק לכל פריט (המלצת אלגוריתם)</p>
                              </div>
                              <SupplierRecommendationsByItem 
                                quoteId={quote.id}
                                quoteItems={quoteDetails.items?.map((item: any) => ({
                                  quoteItemId: item.id,
                                  sizeQuantityId: item.sizeQuantityId,
                                  quantity: item.quantity,
                                  productName: item.productName || getSizeQuantityName(item.sizeQuantityId),
                                })) || []}
                                quoteStatus={quote.status}
                                onSupplierSelected={() => {
                                  refetch();
                                  utils.quotes.list.refetch();
                                  utils.quotes.getById.refetch();
                                }}
                                markupPercentage={pricingData?.pricelist?.markupPercentage || selectedPricelistId ? parseFloat(pricelists?.find((pl: any) => pl.id === selectedPricelistId)?.markupPercentage || '0') : 0}
                              />
                            </div>
                          )}

                          {/* Step 3: Items with Manual Price Editing */}
                          {quoteDetails.items && quoteDetails.items.length > 0 && (
                            <div className={quote.status === "draft" ? "p-3 bg-muted/30 rounded border" : ""}>
                              {quote.status === "draft" && (
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">3</span>
                                  <p className="text-sm font-medium">עריכת מחירים (אופציונלי)</p>
                                </div>
                              )}
                              {quote.status !== "draft" && (
                                <p className="text-sm text-muted-foreground mb-2">פריטים ({quoteDetails.items.length})</p>
                              )}
                              <div className="space-y-2">
                                {quoteDetails.items.map((item: any, index: number) => {
                                  const fullName = item.productName || getSizeQuantityName(item.sizeQuantityId);
                                  const parts = fullName.split(' - ');
                                  const productName = parts[0] || fullName;
                                  const sizeName = parts[1] || '';
                                  const editedPrice = editedPrices[item.id];
                                  const currentPrice = editedPrice?.customerPrice ?? Number(item.priceAtTimeOfQuote || 0);
                                  const isEdited = !!editedPrice;
                                  
                                  return (
                                    <div key={index} className={cn(
                                      "flex items-center justify-between p-3 bg-background rounded border",
                                      item.isManualPrice && "border-yellow-300 bg-yellow-50/50"
                                    )}>
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium">{productName}</span>
                                        {sizeName && <Badge variant="outline" className="text-xs">{sizeName}</Badge>}
                                        <span className="text-muted-foreground">× {item.quantity}</span>
                                        {item.supplierCost && (
                                          <span className="text-xs text-muted-foreground">
                                            (עלות ספק: ₪{Number(item.supplierCost).toLocaleString()})
                                          </span>
                                        )}
                                        {(item.supplierName || item.supplierCompany) && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                            {item.supplierCompany || item.supplierName}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {quote.status === "draft" ? (
                                          <>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={Math.round(currentPrice)}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                handlePriceEdit(item.id, Math.round(parseFloat(e.target.value) || 0));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className={cn(
                                                "w-24 h-8 text-right",
                                                item.isManualPrice && "border-yellow-400 bg-yellow-50",
                                                isEdited && "border-blue-400 bg-blue-50"
                                              )}
                                            />
                                            {isEdited && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSavePrice(item.id);
                                                }}
                                                disabled={updateItemMutation.isPending}
                                              >
                                                <Save className="h-3 w-3 text-green-600" />
                                              </Button>
                                            )}
                                            {item.isManualPrice && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleResetPrice(item.id);
                                                }}
                                                disabled={updateItemMutation.isPending}
                                                title="החזר למחיר אוטומטי"
                                              >
                                                <RotateCcw className="h-3 w-3 text-gray-500" />
                                              </Button>
                                            )}
                                          </>
                                        ) : (
                                          <span className="font-medium">{item.priceAtTimeOfQuote ? `₪${Number(item.priceAtTimeOfQuote).toLocaleString()}` : '-'}</span>
                                        )}
                                        {item.isManualPrice && (
                                          <Badge variant="outline" className="text-[10px] bg-yellow-100 border-yellow-300">
                                            ידני
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Totals - Show when in draft */}
                              {quote.status === "draft" && (
                                <div className="flex items-center justify-end gap-6 mt-3 pt-3 border-t">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">עלות ספקים: </span>
                                    <span className="font-medium">₪{Number(quote.totalSupplierCost || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">מחיר ללקוח: </span>
                                    <span className="font-bold text-green-600">₪{Number(quote.finalValue || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">רווח: </span>
                                    <span className="font-medium text-blue-600">
                                      ₪{(Number(quote.finalValue || 0) - Number(quote.totalSupplierCost || 0)).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Recommended Suppliers by Item - For non-draft statuses */}
                          {quote.status !== "draft" && (
                            <SupplierRecommendationsByItem 
                              quoteId={quote.id}
                              quoteItems={quoteDetails.items?.map((item: any) => ({
                                quoteItemId: item.id,
                                sizeQuantityId: item.sizeQuantityId,
                                quantity: item.quantity,
                                productName: item.productName || getSizeQuantityName(item.sizeQuantityId),
                              })) || []}
                              quoteStatus={quote.status}
                              onSupplierSelected={() => refetch()}
                            />
                          )}
                          
                          {/* Show message if suppliers cannot be assigned yet - only for sent status */}
                          {quote.status === 'sent' && (
                            <p className="text-xs text-muted-foreground mt-2">
                              * ניתן להעביר לספק רק לאחר אישור הלקוח
                            </p>
                          )}

                          {/* Auto Production Toggle - Show only for draft/sent status */}
                          {(quote.status === "draft" || quote.status === "sent") && (
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-600" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800">העבר לייצור אוטומטית לאחר אישור לקוח</p>
                                  <p className="text-xs text-amber-600">אם מופעל ויש ספק מוקצה, ההצעה תעבור ישירות לספק אחרי אישור הלקוח</p>
                                </div>
                              </div>
                              <Switch
                                checked={quote.autoProduction || false}
                                onCheckedChange={(checked) => {
                                  setAutoProductionMutation.mutate({
                                    quoteId: quote.id,
                                    autoProduction: checked,
                                  });
                                }}
                                disabled={setAutoProductionMutation.isPending}
                              />
                            </div>
                          )}

                          {/* Send to Customer Button - Prominent */}
                          {quote.status === "draft" && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2">
                                <Send className="h-4 w-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium text-blue-800">שלח הצעה ללקוח</p>
                                  <p className="text-xs text-blue-600">הלקוח יקבל את ההצעה לאישור</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quote.finalValue && Number(quote.finalValue) > 0) {
                                    sendToCustomerMutation.mutate({ quoteId: quote.id });
                                  } else {
                                    toast.error("לא ניתן לשלוח הצעה ללא מחירים. אנא תמחר קודם.");
                                  }
                                }}
                                disabled={sendToCustomerMutation.isPending || !quote.finalValue || Number(quote.finalValue) <= 0}
                              >
                                {sendToCustomerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 ml-1" />
                                    שלח ללקוח
                                  </>
                                )}
                              </Button>
                            </div>
                          )}

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

      {/* Create Quote Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>הצעת מחיר חדשה</DialogTitle>
            <DialogDescription>הוסף פריטים ליצירת הצעת מחיר</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Customer Selection with Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">לקוח</Label>
              <div className="relative">
                <Input
                  placeholder="הקלד שם לקוח לחיפוש..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pr-8"
                />
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {customerSearch && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {customers
                    ?.filter((c: any) => 
                      c.status === 'active' && 
                      (c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                       c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()))
                    )
                    .slice(0, 5)
                    .map((customer: any) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setCreateForm({ ...createForm, customerId: customer.id });
                          setCustomerSearch(customer.name + (customer.companyName ? ` (${customer.companyName})` : ''));
                        }}
                      >
                        {customer.name} {customer.companyName ? `(${customer.companyName})` : ''}
                      </div>
                    ))}
                </div>
              )}
              {createForm.customerId && !customerSearch.includes(customers?.find((c: any) => c.id === createForm.customerId)?.name || '') && (
                <Badge variant="secondary" className="mt-1">
                  {customers?.find((c: any) => c.id === createForm.customerId)?.name}
                  <X className="h-3 w-3 mr-1 cursor-pointer" onClick={() => {
                    setCreateForm({ ...createForm, customerId: null });
                    setCustomerSearch('');
                  }} />
                </Badge>
              )}
            </div>

            {/* Product Selection */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">הוספת פריט</Label>
              
              {/* Product Search */}
              <div className="relative">
                <Input
                  placeholder="חפש מוצר..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId(null);
                    setSelectedSizeId(null);
                    setSelectedSizeQuantityId('');
                  }}
                  className="pr-8"
                />
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* Product Results */}
              {productSearch && !selectedProductId && (
                <div className="border rounded-md max-h-32 overflow-y-auto bg-background">
                  {(products || [])
                    .filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                    .slice(0, 5)
                    .map((product: any) => (
                      <div
                        key={product.id}
                        className="p-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setProductSearch(product.name);
                        }}
                      >
                        {product.name}
                      </div>
                    ))}
                </div>
              )}

              {/* Size Selection */}
              {selectedProductId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">גודל</Label>
                  <div className="flex flex-wrap gap-2">
                    {(products || []).find((p: any) => p.id === selectedProductId)?.sizes?.map((size: any) => (
                      <Button
                        key={size.id}
                        variant={selectedSizeId === size.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedSizeId(size.id);
                          setSelectedSizeQuantityId('');
                        }}
                        className="flex-col h-auto py-2"
                      >
                        <span>{size.name}</span>
                        {size.dimensions && (
                          <span className="text-xs opacity-70">{size.dimensions}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selection */}
              {selectedSizeId && (() => {
                const quantities = (products || []).find((p: any) => p.id === selectedProductId)
                  ?.sizes?.find((s: any) => s.id === selectedSizeId)?.quantities || [];
                return (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">כמות באריזה</Label>
                    {quantities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {quantities.map((sq: any) => (
                          <Button
                            key={sq.id}
                            variant={selectedSizeQuantityId === sq.id.toString() ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSizeQuantityId(sq.id.toString())}
                          >
                            {sq.quantity} יח'
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">אין כמויות מוגדרות לגודל זה</p>
                    )}
                  </div>
                );
              })()}

              {/* Order Quantity & Notes */}
              {selectedSizeQuantityId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">כמה להזמין?</Label>
                    <Input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">הערה</Label>
                    <Input
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="אופציונלי"
                    />
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                onClick={handleAddItem} 
                className="w-full"
                disabled={!selectedSizeQuantityId}
              >
                <Plus className="ml-2 h-4 w-4" />
                הוסף לרשימה
              </Button>
            </div>

            {/* Items List */}
            {createForm.items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">פריטים ({createForm.items.length})</Label>
                {createForm.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground"> - {item.sizeName} × {item.quantity}</span>
                      {item.notes && <span className="text-muted-foreground text-xs block">{item.notes}</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-sm">הערות</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="הערות להצעה..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* File Upload */}
            <div>
              <Label className="text-sm">קבצים</Label>
              <div className="mt-1 border-2 border-dashed rounded-lg p-3 text-center">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setCreateForm({ ...createForm, files: [...createForm.files, ...files] });
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileUp className="h-6 w-6 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">לחץ להעלאת קבצים</span>
                </label>
              </div>
              {createForm.files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {createForm.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-muted p-1 rounded">
                      <span className="truncate">{file.name}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setCreateForm({ 
                          ...createForm, 
                          files: createForm.files.filter((_, i) => i !== index) 
                        })} 
                      />
                    </div>
                  ))}
                </div>
              )}
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

      {/* Pricing Editor Dialog */}
      <Dialog open={isPricingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPricingDialogOpen(false);
          setPricingData(null);
          setPricingQuoteId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              תמחור הצעת מחיר
            </DialogTitle>
            <DialogDescription>
              הגדר מחירון, בחר ספקים וערוך מחירים לפני שליחה ללקוח
            </DialogDescription>
          </DialogHeader>

          {autoPopulateMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-4" />
              <p className="text-gray-500">טוען מחירים וספקים מומלצים...</p>
            </div>
          ) : pricingData ? (
            <div className="space-y-6">
              {/* Pricelist Selection */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Label className="font-medium">מחירון:</Label>
                <Select
                  value={selectedPricelistId?.toString() || ''}
                  onValueChange={handlePricelistChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="בחר מחירון" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricelists?.map((pl: any) => (
                      <SelectItem key={pl.id} value={pl.id.toString()}>
                        {pl.name} ({parseFloat(pl.markupPercentage || 0).toFixed(0)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pricingData.pricelist && (
                  <Badge variant="secondary">
                    רווח: {pricingData.pricelist.markupPercentage}%
                  </Badge>
                )}
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>פריט</TableHead>
                      <TableHead>כמות</TableHead>
                      <TableHead>ספק</TableHead>
                      <TableHead>מחיר ספק</TableHead>
                      <TableHead>מחיר ללקוח</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingData.items?.map((item: any) => {
                      const editedPrice = editedPrices[item.itemId];
                      const currentPrice = editedPrice?.customerPrice ?? item.customerPrice;
                      const isEdited = !!editedPrice;
                      
                      return (
                        <TableRow key={item.itemId} className={item.isManualPrice ? 'bg-yellow-50' : ''}>
                          <TableCell className="font-medium">
                            {item.productName || `פריט #${item.sizeQuantityId}`}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.supplierName || 'לא נבחר'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600">₪{item.supplierCost?.toFixed(2) || '0'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentPrice}
                                onChange={(e) => handlePriceEdit(item.itemId, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  "w-24 text-right",
                                  item.isManualPrice && "border-yellow-400 bg-yellow-50",
                                  isEdited && "border-blue-400 bg-blue-50"
                                )}
                              />
                              {item.isManualPrice && (
                                <Badge variant="outline" className="text-xs bg-yellow-100 border-yellow-300">
                                  ידני
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isEdited && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSavePrice(item.itemId)}
                                  disabled={updateItemMutation.isPending}
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              {item.isManualPrice && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleResetPrice(item.itemId)}
                                  disabled={updateItemMutation.isPending}
                                  title="החזר למחיר אוטומטי"
                                >
                                  <RotateCcw className="h-4 w-4 text-gray-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-500">עלות ספקים</p>
                  <p className="text-lg font-semibold text-gray-700">₪{pricingData.totals?.supplierCost?.toLocaleString() || '0'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">מחיר ללקוח</p>
                  <p className="text-lg font-bold text-green-600">₪{pricingData.totals?.customerPrice?.toLocaleString() || '0'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">רווח</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ₪{pricingData.totals?.profit?.toLocaleString() || '0'}
                    <span className="text-sm text-gray-500 mr-1">({pricingData.totals?.profitPercentage || 0}%)</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSendToCustomer}
              disabled={sendToCustomerMutation.isPending || !pricingData}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendToCustomerMutation.isPending ? (
                <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> שולח...</>
              ) : (
                <><Send className="h-4 w-4 ml-2" /> שלח ללקוח</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            בחירת ספק להצעה {quoteId}
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
                        {index + 1}
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
  quoteStatus,
  onSupplierSelected,
  markupPercentage = 0,
}: { 
  quoteId: number;
  quoteItems: { quoteItemId: number; sizeQuantityId: number; quantity: number; productName: string }[];
  quoteStatus: string;
  onSupplierSelected: () => void;
  markupPercentage?: number;
}) {
  // In draft mode, clicking supplier just updates prices (no job creation)
  // After approval, clicking supplier creates jobs
  const isDraftMode = quoteStatus === 'draft';
  const canCreateJobs = quoteStatus === 'approved' || quoteStatus === 'in_production';
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);

  const { data: recommendations, isLoading } = trpc.suppliers.recommendationsByCategory.useQuery(
    { quoteItems },
    { enabled: quoteItems.length > 0 }
  );

  // Mutation for draft mode - just update prices
  const selectSupplierMutation = trpc.quotePricing.selectSupplierForPricing.useMutation({
    onSuccess: () => {
      toast.success(`ספק נבחר והמחירים עודכנו!`);
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בבחירת ספק: ${error.message}`);
    },
  });

  // Mutation for after approval - create jobs
  const assignMutation = trpc.suppliers.assignToCategory.useMutation({
    onSuccess: () => {
      toast.success(`העבודה הועברה לספק בהצלחה!`);
      onSupplierSelected();
    },
    onError: (error) => {
      toast.error(`שגיאה בהעברה לספק: ${error.message}`);
    },
  });

  const handleSelectSupplier = (category: CategoryRecommendation, supplier: CategoryRecommendation['suppliers'][0]) => {
    setSelectedSupplier(supplier.supplierId);
    
    // Draft mode - just update prices, no job creation
    if (isDraftMode) {
      console.log('[Draft Mode] Selecting supplier for pricing:', { quoteId, supplierId: supplier.supplierId, markupPercentage });
      selectSupplierMutation.mutate({
        quoteId,
        supplierId: supplier.supplierId,
        items: supplier.canFulfill,
        markupPercentage,
      });
    } else if (canCreateJobs) {
      // After approval - create supplier jobs
      console.log('[Production Mode] Assigning supplier to category:', { quoteId, supplierId: supplier.supplierId });
      assignMutation.mutate({
        quoteId,
        supplierId: supplier.supplierId,
        items: supplier.canFulfill,
      });
    } else {
      // For sent status - show message that we can't assign yet
      toast.info('לא ניתן להעביר לספק לפני אישור הלקוח');
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

  const isPending = selectSupplierMutation.isPending || assignMutation.isPending;

  return (
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

          {/* Selected supplier indicator */}
          {selectedSupplier && category.suppliers.some(s => s.supplierId === selectedSupplier) && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  ספק נבחר: {category.suppliers.find(s => s.supplierId === selectedSupplier)?.supplierName}
                </span>
              </div>
              <span className="text-sm text-green-600">
                ₪{category.suppliers.find(s => s.supplierId === selectedSupplier)?.totalPrice.toLocaleString()}
              </span>
            </div>
          )}

          {/* Suppliers for this category - show up to 5 */}
          {category.suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין ספקים זמינים לתחום זה</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {category.suppliers.slice(0, 5).map((supplier, index) => (
                <button
                  key={supplier.supplierId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSupplier(category, supplier);
                  }}
                  disabled={isPending}
                  className={cn(
                    "flex-1 min-w-[120px] max-w-[180px] p-2 rounded border text-right transition-all",
                    !isPending && "hover:shadow-sm cursor-pointer",
                    isPending && selectedSupplier === supplier.supplierId && "opacity-70",
                    isPending && selectedSupplier !== supplier.supplierId && "opacity-50",
                    index === 0 
                      ? "bg-green-50 border-green-200 hover:border-green-300"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {isPending && selectedSupplier === supplier.supplierId && (
                    <Loader2 className="h-3 w-3 animate-spin absolute top-1 left-1" />
                  )}
                  <p className="font-medium text-sm truncate">{supplier.supplierName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">⭐ {supplier.avgRating.toFixed(1)}</span>
                    <span className="text-xs font-medium">₪{supplier.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{supplier.avgDeliveryDays} ימים</span>
                    <span className="text-xs text-muted-foreground">{supplier.reliabilityPct}% אמינות</span>
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
  );
}


// ==================== NEW: Supplier Recommendations by Item ====================
// Shows supplier recommendations for each individual item (not grouped by category)
// Includes multi-item bonus indicator

interface ItemRecommendation {
  quoteItemId: number;
  sizeQuantityId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  suppliers: {
    supplierId: number;
    supplierName: string;
    supplierCompany: string | null;
    avgRating: number;
    pricePerUnit: number;
    deliveryDays: number;
    reliabilityPct: number;
    totalScore: number;
    rank: number;
    canFulfillOtherItems: number;
    multiItemBonus: number;
  }[];
  selectedSupplierId?: number;
}

function SupplierRecommendationsByItem({ 
  quoteId,
  quoteItems,
  quoteStatus,
  onSupplierSelected,
  markupPercentage = 0,
}: { 
  quoteId: number;
  quoteItems: { quoteItemId: number; sizeQuantityId: number; quantity: number; productName: string }[];
  quoteStatus: string;
  onSupplierSelected: () => void;
  markupPercentage?: number;
}) {
  const isDraftMode = quoteStatus === 'draft';
  const canCreateJobs = quoteStatus === 'approved' || quoteStatus === 'in_production';
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<number, number>>({});

  const { data: recommendations, isLoading, refetch } = trpc.suppliers.recommendationsByItem.useQuery(
    { quoteItems },
    { enabled: quoteItems.length > 0 }
  );

  // Mutation for selecting supplier for a single item
  const selectSupplierMutation = trpc.suppliers.selectForItem.useMutation({
    onSuccess: (data) => {
      toast.success(`ספק נבחר לפריט!`);
      onSupplierSelected();
      refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בבחירת ספק: ${error.message}`);
    },
  });

  const handleSelectSupplier = (item: ItemRecommendation, supplier: ItemRecommendation['suppliers'][0]) => {
    setSelectedSuppliers(prev => ({ ...prev, [item.quoteItemId]: supplier.supplierId }));
    
    if (isDraftMode) {
      selectSupplierMutation.mutate({
        quoteId,
        quoteItemId: item.quoteItemId,
        supplierId: supplier.supplierId,
        pricePerUnit: supplier.pricePerUnit,
        deliveryDays: supplier.deliveryDays,
        markupPercentage,
      });
    } else if (canCreateJobs) {
      // TODO: Create job for single item
      toast.info('יצירת עבודה לפריט בודד - בקרוב');
    } else {
      toast.info('לא ניתן להעביר לספק לפני אישור הלקוח');
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

  const isPending = selectSupplierMutation.isPending;

  return (
    <div className="space-y-3">
      {(recommendations as ItemRecommendation[]).map((item) => (
        <div key={item.quoteItemId} className="p-3 bg-background rounded border">
          {/* Item Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-sm">{item.categoryName}</p>
              <p className="text-xs text-muted-foreground">{item.productName}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {item.quantity} פריטים
            </Badge>
          </div>

          {/* Selected supplier indicator */}
          {selectedSuppliers[item.quoteItemId] && item.suppliers.some(s => s.supplierId === selectedSuppliers[item.quoteItemId]) && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  ספק נבחר: {item.suppliers.find(s => s.supplierId === selectedSuppliers[item.quoteItemId])?.supplierName}
                </span>
              </div>
              <span className="text-sm text-green-600">
                ₪{item.suppliers.find(s => s.supplierId === selectedSuppliers[item.quoteItemId])?.pricePerUnit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Suppliers for this item - show up to 5 */}
          {item.suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין ספקים זמינים לפריט זה</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {item.suppliers.slice(0, 5).map((supplier, index) => (
                <button
                  key={supplier.supplierId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectSupplier(item, supplier);
                  }}
                  disabled={isPending}
                  className={cn(
                    "flex-1 min-w-[120px] max-w-[180px] p-2 rounded border text-right transition-all relative",
                    !isPending && "hover:shadow-sm cursor-pointer",
                    isPending && selectedSuppliers[item.quoteItemId] === supplier.supplierId && "opacity-70",
                    isPending && selectedSuppliers[item.quoteItemId] !== supplier.supplierId && "opacity-50",
                    index === 0 
                      ? "bg-green-50 border-green-200 hover:border-green-300"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {isPending && selectedSuppliers[item.quoteItemId] === supplier.supplierId && (
                    <Loader2 className="h-3 w-3 animate-spin absolute top-1 left-1" />
                  )}
                  <p className="font-medium text-sm truncate">{supplier.supplierName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">⭐ {supplier.avgRating.toFixed(1)}</span>
                    <span className="text-xs font-medium">₪{supplier.pricePerUnit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{supplier.deliveryDays} ימים</span>
                    <span className="text-xs text-muted-foreground">{supplier.reliabilityPct}% אמינות</span>
                  </div>
                  {/* Multi-item bonus indicator */}
                  {supplier.multiItemBonus > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-1 bg-blue-100 text-blue-700 border-blue-200">
                      +{supplier.multiItemBonus}% ({supplier.canFulfillOtherItems} מוצרים נוספים)
                    </Badge>
                  )}
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
  );
}
