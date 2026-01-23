import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Users, 
  TrendingUp,
  ArrowUpLeft,
  ArrowDownLeft,
  CheckCircle2,
  Activity,
  Truck,
  Plus,
  ChevronLeft,
  Clock,
  AlertCircle,
  Inbox,
  Phone,
  Mail,
  Building2,
  Calendar,
  UserCheck,
  X,
  Search,
  Star,
  Zap,
  Shield,
  Package,
  Award,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL').format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Courier Pickup Card - עבודות מוכנות לאיסוף
function CourierPickupCard({ isLoading }: { isLoading: boolean }) {
  const mockPickups = [
    { id: 1, supplier: "דפוס הצפון", customer: "חברת ABC", product: "כרטיסי ביקור", readyAt: "10:30" },
    { id: 2, supplier: "פרינט פלוס", customer: "משרד XYZ", product: "ברושורים", readyAt: "11:00" },
  ];

  return (
    <Card className="animate-slide-up opacity-0 stagger-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Truck className="h-4 w-4 text-muted-foreground" />
            איסוף לשליח
          </CardTitle>
          {mockPickups.length > 0 && (
            <Badge variant="outline" className="text-[11px] font-normal bg-green-50 text-green-700 border-green-200">
              {mockPickups.length} מוכנים
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : mockPickups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין עבודות ממתינות לאיסוף</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockPickups.map((pickup) => (
              <div 
                key={pickup.id}
                className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50/50 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{pickup.product}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="text-green-600 font-medium">{pickup.supplier}</span> → {pickup.customer}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] font-normal bg-green-100 text-green-700 border-green-300">
                    מוכן {pickup.readyAt}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpenJobsCard({ isLoading }: { isLoading: boolean }) {
  const mockJobs = [
    { id: 1, supplier: "דפוס הצפון", product: "כרטיסי ביקור", quantity: 500, status: "בהדפסה", dueDate: "03/01" },
    { id: 2, supplier: "אריזות ישראל", product: "קופסאות מתנה", quantity: 200, status: "ממתין לאישור", dueDate: "05/01" },
    { id: 3, supplier: "פרינט פלוס", product: "ברושורים A4", quantity: 1000, status: "בייצור", dueDate: "04/01" },
  ];

  const getStatusStyle = (status: string) => {
    if (status === "בהדפסה" || status === "בייצור") return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "ממתין לאישור") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <Card className="col-span-full lg:col-span-2 animate-slide-up opacity-0 stagger-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <Truck className="h-4 w-4 text-muted-foreground" />
            עבודות פתוחות אצל ספקים
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => toast.info("בקרוב")}>
            צפה בהכל
            <ChevronLeft className="h-3 w-3 mr-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mockJobs.map((job) => (
              <div 
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{job.product}</span>
                    <span className="text-xs text-muted-foreground">{job.supplier} · {formatNumber(job.quantity)} יח'</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`text-[11px] font-normal ${getStatusStyle(job.status)}`}>
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">עד {job.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Supplier Recommendations Modal Component
interface SupplierRecommendation {
  supplierId: number;
  supplierNumber: number;
  supplierName: string;
  supplierCompany: string | null;
  metrics: {
    avgPrice: number;
    avgRating: number;
    avgDeliveryDays: number;
    reliabilityPct: number;
    totalJobs: number;
  };
  scores: {
    price: number;
    rating: number;
    delivery: number;
    reliability: number;
    total: number;
  };
  weights: {
    price: number;
    rating: number;
    deliveryTime: number;
    reliability: number;
  };
  rank: number;
}

function SupplierRecommendationsModal({ 
  isOpen, 
  onClose, 
  productId,
  productName 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  productId?: number;
  productName?: string;
}) {
  const { data: recommendations, isLoading, error } = trpc.suppliers.enhancedRecommendations.useQuery(
    { productId, limit: 3 },
    { enabled: isOpen }
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50";
    if (score >= 60) return "text-blue-600 bg-blue-50";
    if (score >= 40) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Award, color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
    if (rank === 2) return { icon: Star, color: "text-slate-500 bg-slate-50 border-slate-200" };
    return { icon: Star, color: "text-amber-700 bg-amber-50 border-amber-200" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            המלצות ספקים
          </DialogTitle>
          <DialogDescription>
            {productName ? `3 הספקים המומלצים ביותר עבור ${productName}` : '3 הספקים המומלצים ביותר'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-sm text-muted-foreground">מחשב המלצות...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-sm text-red-600">שגיאה בטעינת המלצות</p>
              <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-8 w-8 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground">אין ספקים זמינים</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Weights Info */}
              {recommendations[0]?.weights && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">משקלות הניקוד:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-white border">מחיר: {recommendations[0].weights.price}%</span>
                    <span className="px-2 py-1 rounded bg-white border">דירוג: {recommendations[0].weights.rating}%</span>
                    <span className="px-2 py-1 rounded bg-white border">מהירות: {recommendations[0].weights.deliveryTime}%</span>
                    <span className="px-2 py-1 rounded bg-white border">אמינות: {recommendations[0].weights.reliability}%</span>
                  </div>
                </div>
              )}

              {/* Supplier Cards */}
              {recommendations.map((supplier: SupplierRecommendation) => {
                const rankBadge = getRankBadge(supplier.rank);
                const RankIcon = rankBadge.icon;
                
                return (
                  <div 
                    key={supplier.supplierId}
                    className={`p-4 rounded-xl border-2 ${supplier.rank === 1 ? 'border-yellow-300 bg-yellow-50/30' : 'border-border bg-white'}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${rankBadge.color}`}>
                          <RankIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{supplier.supplierName}</h3>
                            <Badge variant="outline" className="text-[10px]">#{supplier.supplierNumber}</Badge>
                          </div>
                          {supplier.supplierCompany && (
                            <p className="text-xs text-muted-foreground">{supplier.supplierCompany}</p>
                          )}
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg font-bold text-lg ${getScoreColor(supplier.scores.total)}`}>
                        {supplier.scores.total}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-accent/30 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">מחיר ממוצע</p>
                        <p className="text-sm font-semibold">₪{supplier.metrics.avgPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-accent/30 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">דירוג ממוצע</p>
                        <p className="text-sm font-semibold flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {supplier.metrics.avgRating.toFixed(1)}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-accent/30 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">זמן אספקה</p>
                        <p className="text-sm font-semibold">{supplier.metrics.avgDeliveryDays.toFixed(1)} ימים</p>
                      </div>
                      <div className="p-2 rounded-lg bg-accent/30 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">אמינות</p>
                        <p className="text-sm font-semibold">{supplier.metrics.reliabilityPct}%</p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">פירוט ניקוד:</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all" 
                              style={{ width: `${supplier.scores.price}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">מחיר {supplier.scores.price}</p>
                        </div>
                        <div className="text-center">
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all" 
                              style={{ width: `${supplier.scores.rating}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">דירוג {supplier.scores.rating}</p>
                        </div>
                        <div className="text-center">
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all" 
                              style={{ width: `${supplier.scores.delivery}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">מהירות {supplier.scores.delivery}</p>
                        </div>
                        <div className="text-center">
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all" 
                              style={{ width: `${supplier.scores.reliability}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">אמינות {supplier.scores.reliability}</p>
                        </div>
                      </div>
                    </div>

                    {/* Total Jobs */}
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        מבוסס על {supplier.metrics.totalJobs} עבודות קודמות
                      </span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("בקרוב - בחירת ספק")}>
                        בחר ספק
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>סגור</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for pending quote requests from landing page with modal
function PendingSignupsCard({ signups, isLoading, onRefresh }: { signups: any[]; isLoading: boolean; onRefresh: () => void }) {
  const [selectedSignup, setSelectedSignup] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Mutation to approve customer from signup request
  const approveFromRequestMutation = trpc.admin.approveSignupRequest.useMutation({
    onSuccess: () => {
      toast.success("הלקוח אושר בהצלחה ונוסף לרשימת הלקוחות");
      setSelectedSignup(null);
      onRefresh();
    },
    onError: (error) => {
      toast.error("שגיאה באישור הלקוח: " + error.message);
    },
  });

  const handleApproveCustomer = async () => {
    if (!selectedSignup) return;
    setIsApproving(true);
    try {
      await approveFromRequestMutation.mutateAsync({ requestId: selectedSignup.id });
    } finally {
      setIsApproving(false);
    }
  };

  const handleFindSupplier = () => {
    setShowSupplierModal(true);
  };

  return (
    <>
      <Card className="animate-slide-up opacity-0 stagger-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              בקשות הצעות מחיר חדשות
            </CardTitle>
            {signups.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal bg-blue-50 text-blue-700 border-blue-200 animate-blink-badge">
                {signups.length} חדשות
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : signups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">אין בקשות חדשות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {signups.slice(0, 4).map((signup) => (
                <div 
                  key={signup.id} 
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSignup(signup)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-blue-700">
                        #{signup.queueNumber || signup.id}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{signup.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {signup.companyName || signup.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[11px] font-normal bg-amber-50 text-amber-700 border-amber-200">
                      ממתין
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {signup.createdAt ? formatDate(signup.createdAt) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for viewing signup details */}
      <Dialog open={!!selectedSignup && !showSupplierModal} onOpenChange={() => setSelectedSignup(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  #{selectedSignup?.queueNumber || selectedSignup?.id}
                </span>
              </div>
              בקשת הצעת מחיר
            </DialogTitle>
            <DialogDescription>
              פרטי הבקשה שהתקבלה מהלקוח
            </DialogDescription>
          </DialogHeader>
          
          {selectedSignup && (
            <div className="space-y-4 mt-4">
              {/* Customer Info */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">שם מלא</p>
                    <p className="text-sm font-medium">{selectedSignup.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">אימייל</p>
                    <p className="text-sm font-medium" dir="ltr">{selectedSignup.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">טלפון</p>
                    <p className="text-sm font-medium" dir="ltr">{selectedSignup.phone}</p>
                  </div>
                </div>
                
                {selectedSignup.companyName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">שם החברה</p>
                      <p className="text-sm font-medium">{selectedSignup.companyName}</p>
                    </div>
                  </div>
                )}

                {selectedSignup.productId && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600">מוצר מבוקש</p>
                      <p className="text-sm font-medium text-blue-700">מוצר #{selectedSignup.productId}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">תאריך הבקשה</p>
                    <p className="text-sm font-medium">{selectedSignup.createdAt ? formatFullDate(selectedSignup.createdAt) : 'לא זמין'}</p>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  תיאור הפרויקט
                </p>
                <div className="p-3 rounded-lg bg-accent/30 text-sm whitespace-pre-wrap">
                  {selectedSignup.description}
                </div>
              </div>
              
              {/* Files if any */}
              {selectedSignup.files && selectedSignup.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    קבצים מצורפים ({selectedSignup.files.length})
                  </p>
                  <div className="space-y-2">
                    {selectedSignup.files.map((file: any, index: number) => (
                      <a 
                        key={index} 
                        href={file.url || file.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{file.originalName || file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                            </p>
                          </div>
                        </div>
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons - Updated with new buttons */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                    onClick={handleApproveCustomer}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        מאשר...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 ml-2" />
                        אשר לקוח
                      </>
                    )}
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleFindSupplier}
                  >
                    <Search className="h-4 w-4 ml-2" />
                    חפש ספק
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setSelectedSignup(null)}>
                  סגור
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Recommendations Modal */}
      <SupplierRecommendationsModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        productId={selectedSignup?.productId}
        productName={selectedSignup?.productId ? `מוצר #${selectedSignup.productId}` : undefined}
      />
    </>
  );
}

// Component for pending customer approvals with modal and approve function
function PendingApprovalsCard({ customers, isLoading, onRefresh }: { customers: any[]; isLoading: boolean; onRefresh: () => void }) {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  
  const approveCustomerMutation = trpc.admin.approveCustomer.useMutation({
    onSuccess: () => {
      toast.success("הלקוח אושר בהצלחה ונוסף לרשימת הלקוחות");
      setSelectedCustomer(null);
      onRefresh();
    },
    onError: (error) => {
      toast.error("שגיאה באישור הלקוח: " + error.message);
    },
  });

  const handleApprove = async (customerId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsApproving(true);
    try {
      await approveCustomerMutation.mutateAsync({ customerId });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <>
      <Card className="animate-slide-up opacity-0 stagger-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              לקוחות ממתינים לאישור
            </CardTitle>
            {customers.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal bg-amber-50 text-amber-700 border-amber-200">
                {customers.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">אין לקוחות ממתינים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.slice(0, 4).map((customer) => (
                <div 
                  key={customer.id} 
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{customer.name || 'לקוח חדש'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{customer.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={(e) => handleApprove(customer.id, e)}
                    disabled={isApproving}
                  >
                    <UserCheck className="h-3 w-3 ml-1" />
                    אשר
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for viewing customer details */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              לקוח ממתין לאישור
            </DialogTitle>
            <DialogDescription>
              פרטי הלקוח שממתין לאישור כניסה למערכת
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4 mt-4">
              {/* Customer Info */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">שם מלא</p>
                    <p className="text-sm font-medium">{selectedCustomer.name || 'לא צוין'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">אימייל</p>
                    <p className="text-sm font-medium" dir="ltr">{selectedCustomer.email}</p>
                  </div>
                </div>
                
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">טלפון</p>
                      <p className="text-sm font-medium" dir="ltr">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                )}
                
                {selectedCustomer.companyName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">שם החברה</p>
                      <p className="text-sm font-medium">{selectedCustomer.companyName}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">תאריך הרשמה</p>
                    <p className="text-sm font-medium">{selectedCustomer.createdAt ? formatFullDate(selectedCustomer.createdAt) : 'לא זמין'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-xs text-amber-600">סטטוס</p>
                    <p className="text-sm font-medium text-amber-700">ממתין לאישור</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                  onClick={() => handleApprove(selectedCustomer.id)}
                  disabled={isApproving}
                >
                  <UserCheck className="h-4 w-4 ml-2" />
                  {isApproving ? 'מאשר...' : 'אשר לקוח'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                  סגור
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function KPICard({ title, value, trend, trendValue }: { 
  title: string; 
  value: string; 
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-500',
    neutral: 'text-muted-foreground'
  };

  const TrendIcon = trend === 'up' ? ArrowUpLeft : trend === 'down' ? ArrowDownLeft : TrendingUp;

  return (
    <Card className="animate-slide-up opacity-0 stagger-1">
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-semibold text-foreground">{value}</span>
            <div className={`flex items-center gap-0.5 text-xs ${trendColors[trend]}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendValue}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeedCard({ activities, isLoading }: { activities: any[]; isLoading: boolean }) {
  const actionTypeLabels: Record<string, string> = {
    quote_created: 'נוצרה הצעת מחיר חדשה',
    quote_sent: 'הצעת מחיר נשלחה ללקוח',
    quote_approved: 'הצעת מחיר אושרה',
    quote_rejected: 'הצעת מחיר נדחתה',
    customer_created: 'לקוח חדש נוסף למערכת',
    customer_approved: 'לקוח אושר',
    supplier_created: 'ספק חדש נוסף',
    product_created: 'מוצר חדש נוסף',
    file_validated: 'קובץ עבר ולידציה',
    customer_signup_request: 'התקבלה בקשת הצעת מחיר חדשה',
  };

  const getActivityIcon = (actionType: string) => {
    if (actionType.includes('quote')) return <FileText className="h-3 w-3 text-muted-foreground" />;
    if (actionType.includes('customer')) return <Users className="h-3 w-3 text-muted-foreground" />;
    if (actionType.includes('supplier')) return <Truck className="h-3 w-3 text-muted-foreground" />;
    return <Activity className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card className="animate-slide-up opacity-0 stagger-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity, index) => (
              <div key={activity.id || index} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  {getActivityIcon(activity.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {actionTypeLabels[activity.actionType] || activity.actionType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: "הצעת מחיר חדשה", icon: Plus, onClick: () => toast.info("בקרוב") },
    { label: "הוסף לקוח", icon: Users, onClick: () => toast.info("בקרוב") },
    { label: "הוסף מוצר", icon: FileText, onClick: () => toast.info("בקרוב") },
  ];

  return (
    <Card className="animate-slide-up opacity-0 stagger-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-foreground">פעולות מהירות</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2">
          {actions.map((action, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="justify-start gap-2 h-10"
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = trpc.dashboard.pendingCustomers.useQuery();
  const { data: signups, isLoading: signupsLoading, refetch: refetchSignups } = trpc.dashboard.pendingSignups.useQuery();
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = trpc.dashboard.recentActivity.useQuery();

  const handleCustomerRefresh = () => {
    refetchCustomers();
    refetchActivities();
  };

  const handleSignupsRefresh = () => {
    refetchSignups();
    refetchActivities();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">לוח בקרה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            סקירה כללית של הפעילות העסקית שלך
          </p>
        </div>
        <Button onClick={() => toast.info("בקרוב")} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          הצעת מחיר חדשה
        </Button>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="סה״כ הצעות" 
          value={kpisLoading ? '...' : formatNumber(kpis?.totalQuotes || 0)}
          trend="up"
          trendValue="+12%"
        />
        <KPICard 
          title="לקוחות פעילים" 
          value={kpisLoading ? '...' : formatNumber(kpis?.activeCustomers || 0)}
          trend="up"
          trendValue="+5%"
        />
        <KPICard 
          title="הכנסות" 
          value={kpisLoading ? '...' : formatCurrency(kpis?.totalRevenue || 0)}
          trend="up"
          trendValue="+18%"
        />
        <KPICard 
          title="שיעור המרה" 
          value={kpisLoading ? '...' : `${kpis?.conversionRate || 0}%`}
          trend="neutral"
          trendValue="יציב"
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Jobs - Large Card */}
        <OpenJobsCard isLoading={kpisLoading} />
        
        {/* Courier Pickup */}
        <CourierPickupCard isLoading={kpisLoading} />
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <PendingSignupsCard signups={signups || []} isLoading={signupsLoading} onRefresh={handleSignupsRefresh} />
        <ActivityFeedCard activities={activities || []} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
