import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  ChevronDown,
  ChevronUp,
  History,
  MessageCircle,
  Building2,
  CreditCard,
  Clock,
  User,
  Banknote,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(null);
  const [showHistoryForSupplier, setShowHistoryForSupplier] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    contactPerson: "",
    contactPhone: "",
    whatsapp: "",
    taxId: "",
    paymentTerms: "",
  });
  const [editingJob, setEditingJob] = useState<number | null>(null);
  const [editJobForm, setEditJobForm] = useState({
    supplierRating: 0,
    courierConfirmedReady: true,
    promisedDeliveryDays: 3,
    supplierReadyAt: "" as string | null,
  });
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [editSupplierForm, setEditSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    contactPerson: "",
    contactPhone: "",
    whatsapp: "",
    taxId: "",
    paymentTerms: "",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: suppliers = [], refetch: refetchSuppliers } = trpc.suppliers.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as 'active' | 'pending_approval' | 'rejected' | 'deactivated' : undefined,
    search: searchTerm || undefined,
  });

  const { data: stats } = trpc.suppliers.stats.useQuery();
  const { data: supplierDetails } = trpc.suppliers.getById.useQuery(
    { id: expandedSupplierId! },
    { enabled: !!expandedSupplierId }
  );
  
  const { data: jobsHistory = [], refetch: refetchJobsHistory, isLoading: isLoadingHistory } = trpc.suppliers.jobsHistory.useQuery(
    { supplierId: showHistoryForSupplier! },
    { enabled: !!showHistoryForSupplier }
  );
  
  const { data: scoreDetails, refetch: refetchScoreDetails } = trpc.suppliers.scoreDetails.useQuery(
    { supplierId: expandedSupplierId! },
    { enabled: !!expandedSupplierId }
  );

  // Mutations
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("ספק נוצר בהצלחה");
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", email: "", phone: "", companyName: "", address: "", contactPerson: "", contactPhone: "", whatsapp: "", taxId: "", paymentTerms: "" });
      refetchSuppliers();
      utils.suppliers.stats.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה ביצירת ספק");
    },
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("ספק עודכן בהצלחה");
      refetchSuppliers();
      utils.suppliers.getById.refetch();
      utils.suppliers.stats.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בעדכון ספק");
    },
  });

  const updateJobDataMutation = trpc.suppliers.updateJobData.useMutation({
    onSuccess: () => {
      toast.success("נתוני עבודה עודכנו בהצלחה");
      setEditingJob(null);
      refetchJobsHistory();
      refetchScoreDetails();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בעדכון נתונים");
    },
  });

  const handleCreate = () => {
    if (!createForm.name || !createForm.email) {
      toast.error("שם ואימייל הם שדות חובה");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleStatusChange = (supplierId: number, newStatus: 'active' | 'deactivated') => {
    updateMutation.mutate({ id: supplierId, status: newStatus });
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job.id);
    setEditJobForm({
      supplierRating: job.supplierRating || 0,
      courierConfirmedReady: job.courierConfirmedReady ?? true,
      promisedDeliveryDays: job.promisedDeliveryDays || 3,
      supplierReadyAt: job.supplierReadyAt ? new Date(job.supplierReadyAt).toISOString().slice(0, 16) : "",
    });
  };

  const handleSaveJobData = () => {
    if (!editingJob) return;
    updateJobDataMutation.mutate({
      jobId: editingJob,
      supplierRating: editJobForm.supplierRating || undefined,
      courierConfirmedReady: editJobForm.courierConfirmedReady,
      promisedDeliveryDays: editJobForm.promisedDeliveryDays || undefined,
      supplierReadyAt: editJobForm.supplierReadyAt ? new Date(editJobForm.supplierReadyAt).toISOString() : null,
    });
  };

  const handleRowClick = (supplierId: number) => {
    if (expandedSupplierId === supplierId) {
      setExpandedSupplierId(null);
      setShowHistoryForSupplier(null);
    } else {
      setExpandedSupplierId(supplierId);
      setShowHistoryForSupplier(null);
    }
  };

  const handleShowHistory = (supplierId: number) => {
    setShowHistoryForSupplier(supplierId);
  };

  const handleStartEditSupplier = () => {
    if (supplierDetails) {
      setEditSupplierForm({
        name: supplierDetails.name || "",
        email: supplierDetails.email || "",
        phone: supplierDetails.phone || "",
        companyName: supplierDetails.companyName || "",
        address: supplierDetails.address || "",
        contactPerson: supplierDetails.contactPerson || "",
        contactPhone: supplierDetails.contactPhone || "",
        whatsapp: supplierDetails.whatsapp || "",
        taxId: supplierDetails.taxId || "",
        paymentTerms: supplierDetails.paymentTerms || "",
      });
      setIsEditingSupplier(true);
    }
  };

  const handleSaveSupplier = () => {
    if (!expandedSupplierId) return;
    updateMutation.mutate({
      id: expandedSupplierId,
      ...editSupplierForm,
    });
    setIsEditingSupplier(false);
  };

  const handleCancelEditSupplier = () => {
    setIsEditingSupplier(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">פעיל</Badge>;
      case "pending_approval":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין לאישור</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">נדחה</Badge>;
      case "deactivated":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">לא פעיל</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 110) return "text-green-600";
    if (score >= 100) return "text-blue-600";
    if (score >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  const formatScoreValue = (value: number | undefined) => {
    if (value === undefined || value === null) return "0";
    return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ספקים</h1>
          <p className="text-muted-foreground">ניהול ספקים, מחירים והמלצות</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              ספק חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת ספק חדש</DialogTitle>
              <DialogDescription>הזן את פרטי הספק החדש</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">שם *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="שם הספק"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="050-0000000"
                  dir="ltr"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">שם חברה</Label>
                <Input
                  id="companyName"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  placeholder="שם החברה"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">כתובת</Label>
                <Input
                  id="address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="כתובת מלאה"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">איש קשר נוסף</Label>
                  <Input
                    id="contactPerson"
                    value={createForm.contactPerson}
                    onChange={(e) => setCreateForm({ ...createForm, contactPerson: e.target.value })}
                    placeholder="שם איש קשר"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">טלפון נוסף</Label>
                  <Input
                    id="contactPhone"
                    value={createForm.contactPhone}
                    onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                    placeholder="050-0000000"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp">וואטסאפ</Label>
                  <Input
                    id="whatsapp"
                    value={createForm.whatsapp}
                    onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                    placeholder="050-0000000 (יומר אוטומטית)"
                    dir="ltr"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxId">ח.פ / עוסק מורשה</Label>
                  <Input
                    id="taxId"
                    value={createForm.taxId}
                    onChange={(e) => setCreateForm({ ...createForm, taxId: e.target.value })}
                    placeholder="123456789"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">תנאי תשלום</Label>
                <Input
                  id="paymentTerms"
                  value={createForm.paymentTerms}
                  onChange={(e) => setCreateForm({ ...createForm, paymentTerms: e.target.value })}
                  placeholder="שוטף + 30 / מזומן / וכו'"
                />
              </div>
            </div>
            <DialogFooter className="flex-row-reverse gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "יוצר..." : "צור ספק"}
              </Button>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                ביטול
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ ספקים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ספקים פעילים</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממתינים לאישור</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, אימייל או חברה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="pending_approval">ממתין לאישור</SelectItem>
                <SelectItem value="deactivated">לא פעיל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">חברה</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">ציון</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    לא נמצאו ספקים
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier: any) => (
                  <>
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(supplier.id)}
                    >
                      <TableCell className="w-8">
                        {expandedSupplierId === supplier.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{supplier.name || "-"}</TableCell>
                      <TableCell>{supplier.companyName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{supplier.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{supplier.phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell>
                        {supplier.totalJobs > 0 ? (
                          <span className={`font-bold ${getScoreColor(supplier.score || 0)}`}>
                            {(supplier.score || 0).toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">חדש</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleRowClick(supplier.id)}>
                              <Eye className="ml-2 h-4 w-4" />
                              צפה בפרטים
                            </DropdownMenuItem>
                            {supplier.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(supplier.id, "deactivated")}
                                className="text-red-600"
                              >
                                <Edit className="ml-2 h-4 w-4" />
                                השבת ספק
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(supplier.id, "active")}
                                className="text-green-600"
                              >
                                <Edit className="ml-2 h-4 w-4" />
                                הפעל ספק
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row */}
                    {expandedSupplierId === supplier.id && supplierDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="p-0">
                          <div className="p-6 space-y-6" dir="rtl">
                            
                            {/* כפתור עריכה */}
                            <div className="flex justify-end mb-4">
                              {!isEditingSupplier ? (
                                <Button variant="outline" size="sm" onClick={handleStartEditSupplier}>
                                  <Edit className="ml-2 h-4 w-4" />
                                  עריכת פרטים
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button variant="default" size="sm" onClick={handleSaveSupplier}>
                                    <Save className="ml-2 h-4 w-4" />
                                    שמור
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={handleCancelEditSupplier}>
                                    ביטול
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* פרטי קשר מורחבים */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                פרטי קשר
                              </h4>
                              {isEditingSupplier ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <Label className="text-xs">שם</Label>
                                    <Input
                                      value={editSupplierForm.name}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, name: e.target.value})}
                                      placeholder="שם הספק"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">אימייל</Label>
                                    <Input
                                      value={editSupplierForm.email}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, email: e.target.value})}
                                      placeholder="email@example.com"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">טלפון</Label>
                                    <Input
                                      value={editSupplierForm.phone}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, phone: e.target.value})}
                                      placeholder="050-0000000"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">שם חברה</Label>
                                    <Input
                                      value={editSupplierForm.companyName}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, companyName: e.target.value})}
                                      placeholder="שם החברה"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">כתובת</Label>
                                    <Input
                                      value={editSupplierForm.address}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, address: e.target.value})}
                                      placeholder="כתובת מלאה"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">וואטסאפ</Label>
                                    <Input
                                      value={editSupplierForm.whatsapp}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, whatsapp: e.target.value})}
                                      placeholder="050-0000000"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">איש קשר נוסף</Label>
                                    <Input
                                      value={editSupplierForm.contactPerson}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, contactPerson: e.target.value})}
                                      placeholder="שם איש קשר"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">טלפון נוסף</Label>
                                    <Input
                                      value={editSupplierForm.contactPhone}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, contactPhone: e.target.value})}
                                      placeholder="050-0000000"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">ח.פ / עוסק מורשה</Label>
                                    <Input
                                      value={editSupplierForm.taxId}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, taxId: e.target.value})}
                                      placeholder="123456789"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">תנאי תשלום</Label>
                                    <Input
                                      value={editSupplierForm.paymentTerms}
                                      onChange={(e) => setEditSupplierForm({...editSupplierForm, paymentTerms: e.target.value})}
                                      placeholder="שוטף + 30"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <Label className="text-xs">שם</Label>
                                    <Input
                                      value={supplierDetails.name || ""}
                                      disabled
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">אימייל</Label>
                                    <Input
                                      value={supplierDetails.email || ""}
                                      disabled
                                      dir="ltr"
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">טלפון</Label>
                                    <Input
                                      value={supplierDetails.phone || ""}
                                      disabled
                                      dir="ltr"
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">שם חברה</Label>
                                    <Input
                                      value={supplierDetails.companyName || ""}
                                      disabled
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">כתובת</Label>
                                    <Input
                                      value={supplierDetails.address || ""}
                                      disabled
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">וואטסאפ</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        value={supplierDetails.whatsapp || ""}
                                        disabled
                                        dir="ltr"
                                        className="bg-muted/50 flex-1 text-foreground disabled:text-foreground disabled:opacity-100"
                                      />
                                      {supplierDetails.whatsapp && (
                                        <a 
                                          href={`https://wa.me/${supplierDetails.whatsapp.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 rounded-md text-white"
                                        >
                                          <MessageCircle className="h-4 w-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">איש קשר נוסף</Label>
                                    <Input
                                      value={supplierDetails.contactPerson || ""}
                                      disabled
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">טלפון נוסף</Label>
                                    <Input
                                      value={supplierDetails.contactPhone || ""}
                                      disabled
                                      dir="ltr"
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">ח.פ / עוסק מורשה</Label>
                                    <Input
                                      value={supplierDetails.taxId || ""}
                                      disabled
                                      dir="ltr"
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">תנאי תשלום</Label>
                                    <Input
                                      value={supplierDetails.paymentTerms || ""}
                                      disabled
                                      className="bg-muted/50 text-foreground disabled:text-foreground disabled:opacity-100"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>


                            {/* סטטיסטיקות */}
                            <div className="space-y-3 border-t pt-4">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                סטטיסטיקות
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">סה"כ עבודות:</span>
                                  <span className="font-medium">{scoreDetails?.totalJobs || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Banknote className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">מחזור כספי:</span>
                                  <span className="font-medium">₪{(scoreDetails?.totalRevenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">ציון ממוצע:</span>
                                  <span className={`font-bold ${getScoreColor(scoreDetails?.totalScore || 70)}`}>
                                    {(scoreDetails?.totalScore || 70).toFixed(0)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">עבודה אחרונה:</span>
                                  <span>{scoreDetails?.lastJobDate ? new Date(scoreDetails.lastJobDate).toLocaleDateString('he-IL') : "-"}</span>
                                </div>
                              </div>
                            </div>

                            {/* ציונים */}
                            {scoreDetails && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm">ציונים ({scoreDetails.totalJobs || 0} עבודות)</h4>
                                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">בסיס:</span>
                                    <span className="font-medium">{scoreDetails.scores?.base?.value || 70}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">מחיר:</span>
                                    <span className={`font-medium ${(scoreDetails.scores?.price?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatScoreValue(scoreDetails.scores?.price?.value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">הבטחות:</span>
                                    <span className={`font-medium ${(scoreDetails.scores?.promise?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatScoreValue(scoreDetails.scores?.promise?.value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">שליח:</span>
                                    <span className={`font-medium ${(scoreDetails.scores?.courier?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatScoreValue(scoreDetails.scores?.courier?.value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">מוקדם:</span>
                                    <span className={`font-medium ${(scoreDetails.scores?.early?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatScoreValue(scoreDetails.scores?.early?.value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">עומס:</span>
                                    <span className={`font-medium ${(scoreDetails.scores?.workload?.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatScoreValue(scoreDetails.scores?.workload?.value)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 border-r pr-4">
                                    <span className="font-semibold">סופי:</span>
                                    <span className={`font-bold text-lg ${getScoreColor(scoreDetails.totalScore || 70)}`}>
                                      {(scoreDetails.totalScore || 70).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* כפתור להצגת היסטוריית עבודות */}
                            <div className="space-y-3">
                              {showHistoryForSupplier !== supplier.id ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleShowHistory(supplier.id)}
                                >
                                  <History className="ml-2 h-4 w-4" />
                                  הצג היסטוריית עבודות
                                </Button>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">היסטוריית עבודות</h4>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setShowHistoryForSupplier(null)}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {isLoadingHistory ? (
                                    <p className="text-muted-foreground text-sm">טוען...</p>
                                  ) : jobsHistory.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">אין היסטוריית עבודות</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-right">#</TableHead>
                                            <TableHead className="text-right">תאריך</TableHead>
                                            <TableHead className="text-right">מוצר</TableHead>
                                            <TableHead className="text-right">לקוח</TableHead>
                                            <TableHead className="text-right">כמות</TableHead>
                                            <TableHead className="text-right">מחיר</TableHead>
                                            <TableHead className="text-right">סטטוס</TableHead>
                                            <TableHead className="text-right">ימי הבטחה</TableHead>
                                            <TableHead className="text-right">תאריך מוכן</TableHead>
                                            <TableHead className="text-right">ימים בפועל</TableHead>
                                            <TableHead className="text-right">עמד בהבטחה</TableHead>
                                            <TableHead className="text-right">אישור שליח</TableHead>
                                            <TableHead className="text-right">דירוג</TableHead>
                                            <TableHead className="text-right w-24">עריכה</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {jobsHistory.map((job: any) => (
                                            <TableRow key={job.id} className={editingJob === job.id ? "bg-blue-50" : ""}>
                                              <TableCell className="font-medium">{job.id}</TableCell>
                                              <TableCell className="text-sm">{formatDate(job.createdAt)}</TableCell>
                                              <TableCell className="max-w-[120px] truncate text-sm">{job.productName || "-"}</TableCell>
                                              <TableCell className="max-w-[100px] truncate text-sm">{job.customerName || "-"}</TableCell>
                                              <TableCell>{job.quantity || "-"}</TableCell>
                                              <TableCell dir="ltr">₪{job.pricePerUnit || "-"}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                  {job.status === 'completed' ? 'הושלם' : 
                                                   job.status === 'pending' ? 'ממתין' : 
                                                   job.status === 'in_progress' ? 'בעבודה' : job.status}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                {editingJob === job.id ? (
                                                  <Input
                                                    type="number"
                                                    className="w-16 h-8"
                                                    value={editJobForm.promisedDeliveryDays}
                                                    onChange={(e) => setEditJobForm({...editJobForm, promisedDeliveryDays: parseInt(e.target.value) || 0})}
                                                  />
                                                ) : (
                                                  job.promisedDeliveryDays || "-"
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {editingJob === job.id ? (
                                                  <Input
                                                    type="datetime-local"
                                                    className="w-40 h-8 text-xs"
                                                    value={editJobForm.supplierReadyAt || ""}
                                                    onChange={(e) => setEditJobForm({...editJobForm, supplierReadyAt: e.target.value || null})}
                                                  />
                                                ) : (
                                                  formatDateTime(job.supplierReadyAt)
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {job.actualDeliveryDays !== null && job.actualDeliveryDays !== undefined 
                                                  ? Math.round(job.actualDeliveryDays) 
                                                  : "-"}
                                              </TableCell>
                                              <TableCell>
                                                {job.actualDeliveryDays !== null && job.actualDeliveryDays !== undefined && job.promisedDeliveryDays ? (
                                                  job.actualDeliveryDays <= job.promisedDeliveryDays ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                  ) : (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                  )
                                                ) : (
                                                  <span className="text-muted-foreground">-</span>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {editingJob === job.id ? (
                                                  <Select
                                                    value={editJobForm.courierConfirmedReady ? "true" : "false"}
                                                    onValueChange={(v) => setEditJobForm({...editJobForm, courierConfirmedReady: v === "true"})}
                                                  >
                                                    <SelectTrigger className="w-16 h-8">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="true">כן</SelectItem>
                                                      <SelectItem value="false">לא</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  job.courierConfirmedReady === true ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                  ) : job.courierConfirmedReady === false ? (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                  ) : (
                                                    <AlertCircle className="h-4 w-4 text-gray-400" />
                                                  )
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {editingJob === job.id ? (
                                                  <Select
                                                    value={String(editJobForm.supplierRating)}
                                                    onValueChange={(v) => setEditJobForm({...editJobForm, supplierRating: parseInt(v)})}
                                                  >
                                                    <SelectTrigger className="w-16 h-8">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="0">-</SelectItem>
                                                      <SelectItem value="1">1</SelectItem>
                                                      <SelectItem value="2">2</SelectItem>
                                                      <SelectItem value="3">3</SelectItem>
                                                      <SelectItem value="4">4</SelectItem>
                                                      <SelectItem value="5">5</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  job.supplierRating ? (
                                                    <span className="flex items-center gap-1">
                                                      <Star className="h-3 w-3 text-yellow-500" />
                                                      {job.supplierRating}
                                                    </span>
                                                  ) : "-"
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {editingJob === job.id ? (
                                                  <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={handleSaveJobData}>
                                                      <Save className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingJob(null)}>
                                                      <XCircle className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <Button size="sm" variant="ghost" onClick={() => handleEditJob(job)}>
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
