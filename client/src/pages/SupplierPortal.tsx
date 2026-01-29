import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "sonner";
import { 
  Plus, Edit2, Trash2, Search, User, ArrowRight, 
  Package, Clock, CheckCircle, XCircle, Star, 
  FileText, Download, ChevronLeft, AlertTriangle,
  Truck, Calendar, DollarSign, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Price {
  id: number;
  price: string;
  deliveryDays: number | null;
  updatedAt: Date;
  sizeQuantityId: number;
  quantity: number;
  sizeName: string;
  dimensions: string | null;
  productName: string;
  productId: number;
}

interface SizeQuantity {
  id: number;
  quantity: number;
  price: string;
  sizeName: string;
  dimensions: string | null;
  sizeId: number;
  productName: string;
  productId: number;
  hasPrice: boolean;
}

interface Supplier {
  id: number;
  name: string | null;
  email: string | null;
  companyName?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  createdAt?: Date;
}

interface PendingOrder {
  id: number;
  quoteId: number;
  quoteItemId: number;
  quantity: number;
  pricePerUnit: number;
  promisedDeliveryDays: number;
  createdAt: string;
  isCancelled: boolean;
  cancelledReason: string | null;
  customerName: string;
  customerCompany: string | null;
  productName: string;
  sizeName: string | null;
  dimensions: string | null;
  productId: number;
}

interface ActiveJob {
  id: number;
  quoteId: number;
  quoteItemId: number;
  quantity: number;
  pricePerUnit: number;
  promisedDeliveryDays: number;
  acceptedAt: string;
  createdAt: string;
  status: string;
  isReady: boolean;
  customerName: string;
  customerCompany: string | null;
  productName: string;
  sizeName: string | null;
  dimensions: string | null;
  productId: number;
  attachments: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
}

interface CollectedJob {
  id: number;
  quoteId: number;
  quoteItemId: number;
  quantity: number;
  pricePerUnit: number;
  status: string;
  rating: number | null;
  readyAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerCompany: string | null;
  productName: string;
  sizeName: string | null;
  dimensions: string | null;
  productId: number;
}

interface JobHistory {
  id: number;
  quoteId: number;
  quantity: number;
  pricePerUnit: number;
  status: string;
  rating: number | null;
  readyAt: string | null;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  customerName: string;
  customerCompany: string | null;
  productName: string;
}

// Supplier Selection Screen for Admin
function SupplierSelector({ onSelect }: { onSelect: (supplier: Supplier) => void }) {
  const [search, setSearch] = useState("");
  const { data: suppliers = [], isLoading } = trpc.suppliers.list.useQuery({});

  const filteredSuppliers = suppliers.filter((s: Supplier) => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">פורטל ספקים - מצב צפייה</h1>
        <p className="text-slate-500">בחר ספק כדי לראות את הפורטל שלו</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חפש ספק לפי שם, אימייל או חברה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">טוען ספקים...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">לא נמצאו ספקים</div>
          ) : (
            <div className="divide-y">
              {filteredSuppliers.map((supplier: Supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSelect(supplier)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{supplier.name}</p>
                      <p className="text-sm text-slate-500">
                        {supplier.companyName || supplier.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                      {supplier.status === 'active' ? 'פעיל' : supplier.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ supplierId }: { supplierId: number }) {
  const { data: dashboard, isLoading } = trpc.supplierPortal.enhancedDashboard.useQuery(
    { supplierId },
    { enabled: !!supplierId }
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">טוען נתונים...</div>;
  }

  if (!dashboard) {
    return <div className="p-8 text-center text-slate-400">לא נמצאו נתונים</div>;
  }

  return (
    <div className="space-y-6">
      {/* Supplier Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">{dashboard.supplier.companyName || dashboard.supplier.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-1">
                {dashboard.supplier.email && <span>{dashboard.supplier.email}</span>}
                {dashboard.supplier.phone && <span>• {dashboard.supplier.phone}</span>}
              </CardDescription>
            </div>
            {dashboard.rating.average && (
              <div className="mr-auto flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-yellow-700">{dashboard.rating.average}</span>
                <span className="text-sm text-yellow-600">({dashboard.rating.totalRatings} דירוגים)</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">הזמנות חדשות</p>
                <p className="text-3xl font-bold text-orange-700">{dashboard.stats.pendingOrders}</p>
              </div>
              <Package className="h-10 w-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">בביצוע</p>
                <p className="text-3xl font-bold text-blue-700">{dashboard.stats.inProgress}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">מוכן לאיסוף</p>
                <p className="text-3xl font-bold text-green-700">{dashboard.stats.readyForPickup}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">הושלמו</p>
                <p className="text-3xl font-bold text-purple-700">{dashboard.stats.completed}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Package className="h-6 w-6 text-orange-500" />
              <span>הזמנות חדשות ({dashboard.stats.pendingOrders})</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Clock className="h-6 w-6 text-blue-500" />
              <span>עבודות בביצוע ({dashboard.stats.inProgress})</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-500" />
              <span>מחירון ({dashboard.priceListings} מוצרים)</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pending Orders Tab Component
function PendingOrdersTab({ supplierId }: { supplierId: number }) {
  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.supplierPortal.pendingOrders.useQuery(
    { supplierId },
    { enabled: !!supplierId }
  );

  const acceptJobMutation = trpc.supplierPortal.acceptJob.useMutation({
    onSuccess: () => {
      toast.success("העבודה אושרה בהצלחה!");
      utils.supplierPortal.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה באישור העבודה");
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">טוען הזמנות...</div>;
  }

  const activeOrders = orders.filter((o: PendingOrder) => !o.isCancelled);
  const cancelledOrders = orders.filter((o: PendingOrder) => o.isCancelled);

  return (
    <div className="space-y-6">
      {/* Active Orders */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-500" />
          הזמנות ממתינות לאישור ({activeOrders.length})
        </h3>
        
        {activeOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>אין הזמנות חדשות כרגע</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order: PendingOrder) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          הזמנה #{order.quoteId}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-lg">{order.productName}</h4>
                      {order.sizeName && (
                        <p className="text-sm text-slate-600">
                          גודל: {order.sizeName} {order.dimensions && `(${order.dimensions})`}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-slate-400" />
                          {order.customerName}
                          {order.customerCompany && ` - ${order.customerCompany}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>כמות: <strong>{order.quantity}</strong></span>
                        <span>מחיר ליחידה: <strong>₪{order.pricePerUnit.toFixed(2)}</strong></span>
                        <span>סה"כ: <strong>₪{order.pricePerUnit.toFixed(2)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <Calendar className="h-4 w-4" />
                        <span>זמן אספקה מובטח: {order.promisedDeliveryDays} ימים</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptJobMutation.mutate({ jobId: order.id })}
                      disabled={acceptJobMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 ml-2" />
                      אשר עבודה
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancelled Orders */}
      {cancelledOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            הזמנות שבוטלו ({cancelledOrders.length})
          </h3>
          <div className="space-y-3">
            {cancelledOrders.map((order: PendingOrder) => (
              <Card key={order.id} className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">בוטל</Badge>
                        <span className="text-sm text-slate-500">
                          הזמנה #{order.quoteId}
                        </span>
                      </div>
                      <h4 className="font-semibold text-lg text-red-800">{order.productName}</h4>
                      {order.cancelledReason && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          סיבת ביטול: {order.cancelledReason}
                        </p>
                      )}
                      <p className="text-sm text-slate-500">
                        לקוח: {order.customerName}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-slate-400">לא לבצע</p>
                      <p className="text-sm text-slate-400">אין גישה לקבצים</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Active Jobs Tab Component
function ActiveJobsTab({ supplierId }: { supplierId: number }) {
  const utils = trpc.useUtils();
  const { data: jobs = [], isLoading } = trpc.supplierPortal.activeJobs.useQuery(
    { supplierId },
    { enabled: !!supplierId }
  );

  const markReadyMutation = trpc.supplierPortal.markJobReady.useMutation({
    onSuccess: () => {
      toast.success("העבודה סומנה כמוכנה!");
      utils.supplierPortal.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בסימון העבודה");
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">טוען עבודות...</div>;
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">
          <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>אין עבודות בביצוע כרגע</p>
          <p className="text-sm mt-1">אשר הזמנות חדשות כדי להתחיל לעבוד</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-500" />
        עבודות בביצוע ({jobs.length})
      </h3>

      <div className="space-y-4">
        {jobs.map((job: ActiveJob) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        עבודה #{job.id}
                      </Badge>
                      <Badge variant="secondary">הזמנה #{job.quoteId}</Badge>
                    </div>
                    <h4 className="font-semibold text-lg">{job.productName}</h4>
                    {job.sizeName && (
                      <p className="text-sm text-slate-600">
                        גודל: {job.sizeName} {job.dimensions && `(${job.dimensions})`}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => markReadyMutation.mutate({ jobId: job.id })}
                    disabled={markReadyMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    סמן כמוכן
                  </Button>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500">לקוח</p>
                    <p className="font-medium">{job.customerName}</p>
                    {job.customerCompany && (
                      <p className="text-sm text-slate-500">{job.customerCompany}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">כמות</p>
                    <p className="font-medium">{job.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">מחיר</p>
                    <p className="font-medium">₪{job.pricePerUnit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">אושר בתאריך</p>
                    <p className="font-medium">
                      {job.acceptedAt ? new Date(job.acceptedAt).toLocaleDateString('he-IL') : '-'}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {job.attachments && job.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4 text-slate-400" />
                      קבצים מצורפים ({job.attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Download className="h-4 w-4" />
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({ supplierId }: { supplierId: number }) {
  const { data: history = [], isLoading } = trpc.supplierPortal.jobHistory.useQuery(
    { supplierId, limit: 50 },
    { enabled: !!supplierId }
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">טוען היסטוריה...</div>;
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>אין היסטוריית עבודות</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (job: JobHistory) => {
    if (job.isCancelled) {
      return <Badge variant="destructive">בוטל</Badge>;
    }
    switch (job.status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-700">מוכן</Badge>;
      case 'picked_up':
        return <Badge className="bg-blue-100 text-blue-700">נאסף</Badge>;
      case 'delivered':
        return <Badge className="bg-purple-100 text-purple-700">נמסר</Badge>;
      default:
        return <Badge variant="secondary">{job.status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-purple-500" />
        היסטוריית עבודות ({history.length})
      </h3>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {history.map((job: JobHistory) => (
              <div 
                key={job.id} 
                className={`p-4 ${job.isCancelled ? 'bg-red-50/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job)}
                      <span className="text-sm text-slate-500">הזמנה #{job.quoteId}</span>
                      {job.rating && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-yellow-500" />
                          {job.rating}
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{job.productName}</p>
                    <p className="text-sm text-slate-500">
                      {job.customerName} • כמות: {job.quantity}
                    </p>
                    {job.isCancelled && job.cancelledReason && (
                      <p className="text-sm text-red-600">
                        סיבת ביטול: {job.cancelledReason}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">₪{job.pricePerUnit.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(job.createdAt).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Collected Jobs Tab Component (עבודות שנאספו)
function CollectedJobsTab({ supplierId }: { supplierId: number }) {
  const { data: jobs = [], isLoading } = trpc.supplierPortal.collectedJobs.useQuery(
    { supplierId, limit: 100 },
    { enabled: !!supplierId }
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">טוען עבודות שנאספו...</div>;
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">
          <Truck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>אין עבודות שנאספו</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'picked_up':
        return <Badge className="bg-blue-100 text-blue-700">נאסף</Badge>;
      case 'delivered':
        return <Badge className="bg-purple-100 text-purple-700">נמסר</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="h-5 w-5 text-blue-500" />
        עבודות שנאספו ({jobs.length})
      </h3>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {jobs.map((job: CollectedJob) => (
              <div key={job.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                      <span className="text-sm text-slate-500">הזמנה #{job.quoteId}</span>
                      {job.rating && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-yellow-500" />
                          {job.rating}
                        </span>
                      )}
                    </div>
                    <p className="font-medium">
                      {job.productName}
                      {job.sizeName && <span className="text-slate-500"> - {job.sizeName}</span>}
                      {job.dimensions && <span className="text-slate-400 text-sm"> ({job.dimensions})</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {job.customerName}
                      {job.customerCompany && <span> • {job.customerCompany}</span>}
                      {' '}• כמות: {job.quantity}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">₪{job.pricePerUnit.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(job.updatedAt).toLocaleDateString('he-IL')}
                    </p>
                    {job.readyAt && (
                      <p className="text-xs text-slate-400">
                        מוכן: {new Date(job.readyAt).toLocaleDateString('he-IL')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pricelist Tab Component (existing functionality)
function PricelistTab({ supplierId }: { supplierId: number }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Price>>({});
  const [addFormData, setAddFormData] = useState({
    sizeQuantityId: 0,
    price: 0,
    deliveryDays: 7,
  });

  const limit = 20;
  const utils = trpc.useUtils();

  const { data: pricesData } = trpc.supplierPortal.prices.useQuery({
    page,
    limit,
    search: search || undefined,
    supplierId,
  });

  const { data: sizeQuantities = [] } = trpc.supplierPortal.availableSizeQuantities.useQuery({
    search: search || undefined,
    supplierId,
  });

  const createPriceMutation = trpc.supplierPortal.createPrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר נוסף בהצלחה");
      utils.supplierPortal.invalidate();
      setShowAddModal(false);
      setAddFormData({ sizeQuantityId: 0, price: 0, deliveryDays: 7 });
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בהוספת מחיר");
    },
  });

  const updatePriceMutation = trpc.supplierPortal.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר עודכן בהצלחה");
      utils.supplierPortal.invalidate();
      setEditingId(null);
      setEditFormData({});
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בעדכון מחיר");
    },
  });

  const deletePriceMutation = trpc.supplierPortal.deletePrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר נמחק בהצלחה");
      utils.supplierPortal.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה במחיקת מחיר");
    },
  });

  const prices = pricesData?.data || [];
  const totalPages = pricesData?.totalPages || 1;

  const handleEditStart = (price: Price) => {
    setEditingId(price.id);
    setEditFormData(price);
  };

  const handleEditSave = () => {
    if (editingId) {
      updatePriceMutation.mutate({
        id: editingId,
        price: editFormData.price ? parseFloat(editFormData.price as any) : undefined,
        deliveryDays: editFormData.deliveryDays || undefined,
      });
    }
  };

  const handleAddPrice = () => {
    if (!addFormData.sizeQuantityId || addFormData.price <= 0) {
      toast.error("נא למלא את כל השדות");
      return;
    }
    createPriceMutation.mutate({
      sizeQuantityId: addFormData.sizeQuantityId,
      price: addFormData.price,
      deliveryDays: addFormData.deliveryDays,
      supplierId,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          מחירון ({prices.length} מוצרים)
        </h3>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 ml-2" />
          הוסף מחיר
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="חפש מוצר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Prices Table */}
      <Card>
        <CardContent className="p-0">
          {prices.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>אין מחירים במחירון</p>
              <p className="text-sm mt-1">הוסף מחירים למוצרים שאתה מספק</p>
            </div>
          ) : (
            <div className="divide-y">
              {prices.map((price: Price) => (
                <div key={price.id} className="p-4 hover:bg-slate-50">
                  {editingId === price.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-sm text-slate-500">מחיר</label>
                          <Input
                            type="number"
                            value={editFormData.price || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-slate-500">ימי אספקה</label>
                          <Input
                            type="number"
                            value={editFormData.deliveryDays || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, deliveryDays: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleEditSave} disabled={updatePriceMutation.isPending}>
                          שמור
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          ביטול
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{price.productName}</p>
                        <p className="text-sm text-slate-500">
                          {price.sizeName} {price.dimensions && `(${price.dimensions})`} • כמות: {price.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-semibold">₪{parseFloat(price.price).toFixed(2)}</p>
                          <p className="text-sm text-slate-500">{price.deliveryDays} ימי אספקה</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditStart(price)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deletePriceMutation.mutate({ id: price.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            הקודם
          </Button>
          <span className="px-4 py-2 text-sm">
            עמוד {page} מתוך {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            הבא
          </Button>
        </div>
      )}

      {/* Add Price Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף מחיר חדש</DialogTitle>
            <DialogDescription>
              בחר מוצר והגדר מחיר וזמן אספקה
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">מוצר</label>
              <select
                className="w-full mt-1 p-2 border rounded-lg"
                value={addFormData.sizeQuantityId}
                onChange={(e) => setAddFormData({ ...addFormData, sizeQuantityId: parseInt(e.target.value) })}
              >
                <option value={0}>בחר מוצר...</option>
                {sizeQuantities
                  .filter((sq: SizeQuantity) => !sq.hasPrice)
                  .map((sq: SizeQuantity) => (
                    <option key={sq.id} value={sq.id}>
                      {sq.productName} - {sq.sizeName} ({sq.dimensions}) - כמות {sq.quantity}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">מחיר (₪)</label>
              <Input
                type="number"
                value={addFormData.price || ''}
                onChange={(e) => setAddFormData({ ...addFormData, price: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">ימי אספקה</label>
              <Input
                type="number"
                value={addFormData.deliveryDays}
                onChange={(e) => setAddFormData({ ...addFormData, deliveryDays: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddPrice} disabled={createPriceMutation.isPending}>
              {createPriceMutation.isPending ? "מוסיף..." : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Supplier Portal View (what the supplier sees)
function SupplierPortalView({ supplier, onBack }: { supplier: Supplier; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data: user } = trpc.auth.me.useQuery();
  const isAdminOrEmployee = user?.role === "admin" || user?.role === "employee";

  return (
    <div className="space-y-6">
      {/* Header with back button for admin */}
      {isAdminOrEmployee && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            חזרה לרשימת הספקים
          </Button>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            מצב צפייה: {supplier.name}
          </Badge>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            דשבורד
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2">
            <Clock className="h-4 w-4" />
            בביצוע
          </TabsTrigger>
          <TabsTrigger value="pricelist" className="gap-2">
            <DollarSign className="h-4 w-4" />
            מחירון
          </TabsTrigger>
          <TabsTrigger value="collected" className="gap-2">
            <Truck className="h-4 w-4" />
            נאספו
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            היסטוריה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab supplierId={supplier.id} />
        </TabsContent>

        <TabsContent value="jobs">
          <ActiveJobsTab supplierId={supplier.id} />
        </TabsContent>

        <TabsContent value="pricelist">
          <PricelistTab supplierId={supplier.id} />
        </TabsContent>

        <TabsContent value="collected">
          <CollectedJobsTab supplierId={supplier.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab supplierId={supplier.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Main Component
export default function SupplierPortal() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { data: user } = trpc.auth.me.useQuery();

  // Check if user is admin/employee - show supplier selector
  const isAdminOrEmployee = user?.role === "admin" || user?.role === "employee";

  return (
    <DashboardLayout>
      {isAdminOrEmployee && !selectedSupplier ? (
        <SupplierSelector onSelect={setSelectedSupplier} />
      ) : selectedSupplier ? (
        <SupplierPortalView 
          supplier={selectedSupplier} 
          onBack={() => setSelectedSupplier(null)} 
        />
      ) : (
        // For actual suppliers - show their own portal directly
        <SupplierPortalView 
          supplier={{ id: user?.id || 0, name: user?.name || '', email: user?.email || '', status: 'active' }} 
          onBack={() => {}} 
        />
      )}
    </DashboardLayout>
  );
}
