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
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name || "-"}</TableCell>
                    <TableCell>{supplier.companyName || "-"}</TableCell>
                    <TableCell>{supplier.email || "-"}</TableCell>
                    <TableCell>{supplier.phone || "-"}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(supplier.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>
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
                ))
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">פרטים</TabsTrigger>
                <TabsTrigger value="prices">מחירים ({supplierPrices.length})</TabsTrigger>
                <TabsTrigger value="jobs">עבודות ({openJobs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
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
                          {supplierPrices.map((price) => (
                            <TableRow key={price.id}>
                              <TableCell>{price.productName}</TableCell>
                              <TableCell>{price.variantName}</TableCell>
                              <TableCell className="font-medium">
                                ₪{Number(price.price).toLocaleString()}
                              </TableCell>
                              <TableCell>{price.deliveryDays} ימים</TableCell>
                              <TableCell>{price.minQuantity}</TableCell>
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
                          {openJobs.map((job) => (
                            <TableRow key={job.quoteItemId}>
                              <TableCell>#{job.quoteId}</TableCell>
                              <TableCell>{job.productName} - {job.variantName}</TableCell>
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
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
