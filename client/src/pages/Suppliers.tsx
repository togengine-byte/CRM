import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Edit,
  Briefcase,
  Star,
  Zap,
  Shield,
  DollarSign,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Award,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
  });
  const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<number | null>(null);
  const [editJobForm, setEditJobForm] = useState({
    supplierRating: 0,
    courierConfirmedReady: true,
    promisedDeliveryDays: 3,
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: suppliers = [], refetch: refetchSuppliers } = trpc.suppliers.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as 'active' | 'pending_approval' | 'rejected' | 'deactivated' : undefined,
    search: searchTerm || undefined,
  });

  const { data: stats } = trpc.suppliers.stats.useQuery();
  const { data: supplierDetails } = trpc.suppliers.getById.useQuery(
    { id: selectedSupplier! },
    { enabled: !!selectedSupplier }
  );
  const { data: supplierPrices = [] } = trpc.suppliers.prices.useQuery(
    { supplierId: selectedSupplier! },
    { enabled: !!selectedSupplier }
  );
  const { data: openJobs = [] } = trpc.suppliers.openJobs.useQuery(
    { supplierId: selectedSupplier! },
    { enabled: !!selectedSupplier }
  );
  const { data: jobsHistory = [], refetch: refetchJobsHistory } = trpc.suppliers.jobsHistory.useQuery(
    { supplierId: selectedSupplier! },
    { enabled: !!selectedSupplier && isDataDialogOpen }
  );
  const { data: scoreDetails, refetch: refetchScoreDetails } = trpc.suppliers.scoreDetails.useQuery(
    { supplierId: selectedSupplier! },
    { enabled: !!selectedSupplier }
  );

  // Mutations
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("ספק נוצר בהצלחה");
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", email: "", phone: "", companyName: "", address: "" });
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
    });
  };

  const handleSaveJobData = () => {
    if (!editingJob) return;
    updateJobDataMutation.mutate({
      jobId: editingJob,
      supplierRating: editJobForm.supplierRating || undefined,
      courierConfirmedReady: editJobForm.courierConfirmedReady,
      promisedDeliveryDays: editJobForm.promisedDeliveryDays || undefined,
    });
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

  return (
    <div className="space-y-6">
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
          <DialogContent className="sm:max-w-[500px]">
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="050-0000000"
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "יוצר..." : "צור ספק"}
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
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ממתינים לאישור</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
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
        <CardHeader>
          <CardTitle>רשימת ספקים</CardTitle>
          <CardDescription>
            {suppliers.length} ספקים נמצאו
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">חברה</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תאריך הצטרפות</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    לא נמצאו ספקים
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <>
                    <TableRow
                      key={supplier.id}
                      onClick={() => {
                        setSelectedSupplier(supplier.id);
                        setIsDetailsOpen(selectedSupplier === supplier.id ? !isDetailsOpen : true);
                      }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{supplier.name || "-"}</TableCell>
                      <TableCell>{supplier.companyName || "-"}</TableCell>
                      <TableCell>{supplier.email || "-"}</TableCell>
                      <TableCell>{supplier.phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(supplier.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSupplier(supplier.id);
                                setIsDetailsOpen(true);
                              }}
                            >
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
                  </>))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {supplierDetails?.name || "פרטי ספק"}
            </SheetTitle>
            <SheetDescription>
              {supplierDetails?.companyName || ""}
            </SheetDescription>
          </SheetHeader>

          {supplierDetails && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">פרטים</TabsTrigger>
                <TabsTrigger value="prices">מחירים ({supplierPrices.length})</TabsTrigger>
                <TabsTrigger value="jobs">עבודות ({openJobs.length})</TabsTrigger>
                <TabsTrigger value="data" onClick={() => setIsDataDialogOpen(true)}>דאטה</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                {/* פרטי קשר */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">פרטי קשר</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{supplierDetails.email || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{supplierDetails.phone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{supplierDetails.address || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{supplierDetails.openJobsCount} עבודות פתוחות</span>
                    </div>
                    <div className="pt-2">
                      {getStatusBadge(supplierDetails.status)}
                    </div>
                  </CardContent>
                </Card>

                {/* דירוגים */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">דירוגים</CardTitle>
                    <CardDescription>ביצועים מבוססים על היסטוריית עבודות</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {supplierDetails.ratings ? (
                      <>
                        {/* איכות */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="font-medium">איכות</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {supplierDetails.ratings.quality.score}% ({supplierDetails.ratings.quality.avgRating.toFixed(1)}/5 מ-{supplierDetails.ratings.quality.totalRatings} דירוגים)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 transition-all" 
                              style={{ width: `${supplierDetails.ratings.quality.score}%` }}
                            />
                          </div>
                        </div>

                        {/* אמינות */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-green-500" />
                              <span className="font-medium">אמינות</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {supplierDetails.ratings.reliability.score}% ({supplierDetails.ratings.reliability.reliableJobs}/{supplierDetails.ratings.reliability.totalReadyJobs} עבודות)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all" 
                              style={{ width: `${supplierDetails.ratings.reliability.score}%` }}
                            />
                          </div>
                        </div>

                        {/* מהירות */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">מהירות</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {supplierDetails.ratings.speed.score}% (ממוצע {supplierDetails.ratings.speed.avgDeliveryDays} ימים)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all" 
                              style={{ width: `${supplierDetails.ratings.speed.score}%` }}
                            />
                          </div>
                        </div>

                        {/* מחיר */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">מחיר</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {supplierDetails.ratings.price.score}% (ספק: ₪{supplierDetails.ratings.price.supplierAvg} / שוק: ₪{supplierDetails.ratings.price.marketAvg})
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all" 
                              style={{ width: `${supplierDetails.ratings.price.score}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        אין נתוני דירוג לספק זה
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prices" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">מחירון ספק</CardTitle>
                    <CardDescription>מחירים לפי וריאנט מוצר</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {supplierPrices.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        אין מחירים מוגדרים לספק זה
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">מוצר</TableHead>
                            <TableHead className="text-right">וריאנט</TableHead>
                            <TableHead className="text-right">מחיר</TableHead>
                            <TableHead className="text-right">ימי אספקה</TableHead>
                            <TableHead className="text-right">כמות מינימום</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplierPrices.map((price: any) => (
                            <TableRow key={price.id}>
                              <TableCell>{price.productName}</TableCell>
                              <TableCell>{price.sizeName} {price.dimensions ? `(${price.dimensions})` : ''}</TableCell>
                              <TableCell className="font-medium">
                                ₪{Number(price.price).toLocaleString()}
                              </TableCell>
                              <TableCell>{price.deliveryDays} ימים</TableCell>
                              <TableCell>{price.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">עבודות פתוחות</CardTitle>
                    <CardDescription>עבודות שהוקצו לספק זה</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {openJobs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        אין עבודות פתוחות לספק זה
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">הצעה #</TableHead>
                            <TableHead className="text-right">מוצר</TableHead>
                            <TableHead className="text-right">כמות</TableHead>
                            <TableHead className="text-right">עלות</TableHead>
                            <TableHead className="text-right">סטטוס</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openJobs.map((job: any) => (
                            <TableRow key={job.quoteItemId}>
                              <TableCell>{job.quoteId}</TableCell>
                              <TableCell>{job.productName} - {job.sizeName} {job.dimensions ? `(${job.dimensions})` : ''}</TableCell>
                              <TableCell>{job.quantity}</TableCell>
                              <TableCell>
                                {job.supplierCost ? `₪${Number(job.supplierCost).toLocaleString()}` : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{job.quoteStatus}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* טאב דאטה */}
              <TabsContent value="data" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      היסטוריית עבודות
                    </CardTitle>
                    <CardDescription>כל העבודות שהספק ביצע - לחץ לעריכה</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jobsHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        אין היסטוריית עבודות לספק זה
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">מס' עבודה</TableHead>
                              <TableHead className="text-right">מוצר</TableHead>
                              <TableHead className="text-right">ימים לביצוע</TableHead>
                              <TableHead className="text-right">הבטחה</TableHead>
                              <TableHead className="text-right">עמד בהבטחה</TableHead>
                              <TableHead className="text-right">אישור שליח</TableHead>
                              <TableHead className="text-right">דירוג</TableHead>
                              <TableHead className="text-right">פעולות</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobsHistory.map((job: any) => (
                              <TableRow key={job.id} className={editingJob === job.id ? "bg-blue-50" : ""}>
                                <TableCell>{job.id}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{job.productName}</TableCell>
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
                                <TableCell>{job.actualDays !== null ? `${job.actualDays} ימים` : "-"}</TableCell>
                                <TableCell>
                                  {job.actualDays !== null && job.promisedDeliveryDays ? (
                                    job.actualDays <= job.promisedDeliveryDays ? (
                                      <Badge className="bg-green-100 text-green-800">כן</Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-800">לא</Badge>
                                    )
                                  ) : "-"}
                                </TableCell>
                                <TableCell>
                                  {editingJob === job.id ? (
                                    <Select
                                      value={editJobForm.courierConfirmedReady ? "true" : "false"}
                                      onValueChange={(v) => setEditJobForm({...editJobForm, courierConfirmedReady: v === "true"})}
                                    >
                                      <SelectTrigger className="w-20 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">כן</SelectItem>
                                        <SelectItem value="false">לא</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    job.courierConfirmedReady ? (
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
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingJob(null)}>
                                        <XCircle className="h-4 w-4" />
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* כרטיס ציון סופי */}
          {supplierDetails && scoreDetails && (
            <Card className="mt-6 border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  ציון ספק כולל
                </CardTitle>
                <CardDescription>
                  מבוסס על {scoreDetails.totalJobs} עבודות
                  {scoreDetails.totalJobs < 10 && " (ספק חדש - אין מספיק דאטה)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">ציון בסיס:</span>
                    <span className="font-medium">{scoreDetails.breakdown.baseScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">מחיר:</span>
                    <span className={`font-medium ${scoreDetails.breakdown.priceScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreDetails.breakdown.priceScore >= 0 ? '+' : ''}{scoreDetails.breakdown.priceScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">עמידה בהבטחות:</span>
                    <span className={`font-medium ${scoreDetails.breakdown.promiseScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreDetails.breakdown.promiseScore >= 0 ? '+' : ''}{scoreDetails.breakdown.promiseScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">אישור שליח:</span>
                    <span className={`font-medium ${scoreDetails.breakdown.courierScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreDetails.breakdown.courierScore >= 0 ? '+' : ''}{scoreDetails.breakdown.courierScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">סיום מוקדם:</span>
                    <span className={`font-medium ${scoreDetails.breakdown.earlyScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreDetails.breakdown.earlyScore >= 0 ? '+' : ''}{scoreDetails.breakdown.earlyScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">עומס נוכחי:</span>
                    <span className={`font-medium ${scoreDetails.breakdown.loadScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scoreDetails.breakdown.loadScore >= 0 ? '+' : ''}{scoreDetails.breakdown.loadScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-lg font-semibold">ציון סופי:</span>
                  <span className={`text-2xl font-bold ${
                    scoreDetails.totalScore >= 110 ? 'text-green-600' :
                    scoreDetails.totalScore >= 100 ? 'text-blue-600' :
                    scoreDetails.totalScore >= 90 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {scoreDetails.totalScore.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
