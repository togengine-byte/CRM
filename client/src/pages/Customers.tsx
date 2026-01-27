import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Clock,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Tag,
} from "lucide-react";

type CustomerStatus = "pending_approval" | "active" | "rejected" | "deactivated";

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
  billingEmail: string;
}

export default function Customers() {
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editForm, setEditForm] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    billingEmail: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    billingEmail: "",
  });

  const utils = trpc.useUtils();

  const { data: customers, isLoading, refetch } = trpc.customers.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  const { data: stats } = trpc.customers.stats.useQuery();

  const { data: customerDetails } = trpc.customers.getById.useQuery(
    { id: selectedCustomerId! },
    { enabled: !!selectedCustomerId && isDetailsOpen }
  );

  const { data: pricelists } = trpc.pricelists.list.useQuery();

  const approveMutation = trpc.customers.approve.useMutation({
    onSuccess: () => {
      toast.success("הלקוח אושר בהצלחה");
      refetch();
      utils.customers.stats.refetch();
      utils.customers.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה באישור הלקוח: ${error.message}`);
    },
  });

  const rejectMutation = trpc.customers.reject.useMutation({
    onSuccess: () => {
      toast.success("הלקוח נדחה");
      refetch();
      utils.customers.stats.refetch();
      utils.customers.getById.refetch();
      setIsRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(`שגיאה בדחיית הלקוח: ${error.message}`);
    },
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("פרטי הלקוח עודכנו");
      refetch();
      utils.customers.getById.refetch();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הלקוח: ${error.message}`);
    },
  });

  const assignPricelistMutation = trpc.customers.assignPricelist.useMutation({
    onSuccess: () => {
      toast.success("המחירון הוקצה ללקוח");
      utils.customers.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בהקצאת המחירון: ${error.message}`);
    },
  });

  const removePricelistMutation = trpc.customers.removePricelist.useMutation({
    onSuccess: () => {
      toast.success("המחירון הוסר מהלקוח");
      utils.customers.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בהסרת המחירון: ${error.message}`);
    },
  });

  const setDefaultPricelistMutation = trpc.customers.setDefaultPricelist.useMutation({
    onSuccess: () => {
      toast.success("מחירון ברירת מחדל עודכן");
      utils.customers.getById.refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון מחירון: ${error.message}`);
    },
  });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("הלקוח נוצר בהצלחה");
      refetch();
      utils.customers.stats.refetch();
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        address: "",
        billingEmail: "",
      });
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת הלקוח: ${error.message}`);
    },
  });

  const handleApprove = (customerId: number) => {
    approveMutation.mutate({ customerId });
  };

  const handleReject = () => {
    if (selectedCustomerId) {
      rejectMutation.mutate({
        customerId: selectedCustomerId,
        reason: rejectReason || undefined,
      });
    }
  };

  const handleOpenRejectDialog = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsRejectDialogOpen(true);
  };

  const handleViewDetails = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsDetailsOpen(true);
  };

  const handleEditCustomer = (customer: NonNullable<typeof customers>[0]) => {
    setSelectedCustomerId(customer.id);
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      companyName: customer.companyName || "",
      address: customer.address || "",
      billingEmail: (customer as any).billingEmail || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = () => {
    if (selectedCustomerId) {
      updateMutation.mutate({
        id: selectedCustomerId,
        ...editForm,
      });
    }
  };

  const handleCreateCustomer = () => {
    if (!createForm.name || !createForm.email || !createForm.phone) {
      toast.error("נא למלא שם, אימייל וטלפון");
      return;
    }
    createMutation.mutate({
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone,
      companyName: createForm.companyName || undefined,
      address: createForm.address || undefined,
      billingEmail: createForm.billingEmail || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <UserCheck className="ml-1 h-3 w-3" />
            פעיל
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="ml-1 h-3 w-3" />
            ממתין לאישור
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <UserX className="ml-1 h-3 w-3" />
            נדחה
          </Badge>
        );
      case "deactivated":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            לא פעיל
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">לקוחות</h1>
          <p className="text-muted-foreground">ניהול לקוחות ואישור בקשות הרשמה</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Users className="ml-2 h-4 w-4" />
          לקוח חדש
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה״כ לקוחות</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">לקוחות פעילים</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינים לאישור</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נדחו</p>
                <p className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, אימייל, טלפון או חברה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CustomerStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעילים</SelectItem>
                <SelectItem value="pending_approval">ממתינים לאישור</SelectItem>
                <SelectItem value="rejected">נדחו</SelectItem>
                <SelectItem value="deactivated">לא פעילים</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            רשימת לקוחות
            {customers && (
              <Badge variant="secondary" className="mr-2">
                {customers.length} לקוחות
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין לקוחות</h3>
              <p className="text-muted-foreground mt-1">לא נמצאו לקוחות התואמים לחיפוש</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">חברה</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך הרשמה</TableHead>
                  <TableHead className="text-left w-[100px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <>
                    <TableRow
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setIsDetailsOpen(selectedCustomerId === customer.id ? !isDetailsOpen : true);
                      }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{customer.name || "-"}</TableCell>
                      <TableCell>{customer.companyName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(customer.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Pencil className="ml-2 h-4 w-4" />
                              עריכה
                            </DropdownMenuItem>
                            {customer.status === "pending_approval" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleApprove(customer.id)}
                                  className="text-green-600 focus:text-green-600"
                                >
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  אישור
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenRejectDialog(customer.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <XCircle className="ml-2 h-4 w-4" />
                                  דחייה
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {selectedCustomerId === customer.id && isDetailsOpen && customerDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7}>
                          <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="font-semibold">פרטי לקוח</h3>
                              <Button variant="outline" size="sm" onClick={() => handleEditCustomer(customerDetails as any)}>
                                <Pencil className="ml-2 h-4 w-4" />
                                עריכה
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div>
                                <p className="text-sm text-muted-foreground">שם</p>
                                <p className="font-medium">{customerDetails.name || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">אימייל</p>
                                <p className="font-medium">{customerDetails.email || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">אימייל לחשבונית</p>
                                <p className="font-medium">{(customerDetails as any).billingEmail || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">טלפון</p>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{customerDetails.phone || "-"}</p>
                                  {customerDetails.phone && (
                                    <a
                                      href={`https://wa.me/${customerDetails.phone.replace(/^0/, '972').replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-700"
                                      title="שלח הודעה בוואטסאפ"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                      </svg>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">חברה</p>
                                <p className="font-medium">{customerDetails.companyName || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">כתובת</p>
                                <p className="font-medium">{customerDetails.address || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">סטטוס</p>
                                <div className="mt-1">{getStatusBadge(customerDetails.status)}</div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">תאריך הרשמה</p>
                                <p className="font-medium">{new Date(customerDetails.createdAt).toLocaleDateString("he-IL")}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">מחירון ברירת מחדל</p>
                                <Select
                                  value={(customerDetails as any).pricelistId?.toString() || "system-default"}
                                  onValueChange={(value) => {
                                    setDefaultPricelistMutation.mutate({
                                      customerId: customerDetails.id,
                                      pricelistId: value === "system-default" ? null : parseInt(value),
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[180px] h-8 mt-1">
                                    <SelectValue placeholder="בחר מחירון" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="system-default">
                                      ברירת מחדל ({pricelists?.find((p: any) => p.isDefault)?.name || "מחירון בסיסי"} - {pricelists?.find((p: any) => p.isDefault)?.markupPercentage || 30}%)
                                    </SelectItem>
                                    {pricelists?.filter((p: any) => !p.isDefault).map((pricelist: any) => (
                                      <SelectItem key={pricelist.id} value={pricelist.id.toString()}>
                                        {pricelist.name} ({pricelist.markupPercentage}%)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
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

      {/* Customer Details Sheet */}


      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>עריכת פרטי לקוח</DialogTitle>
            <DialogDescription>עדכן את פרטי הלקוח</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">שם חברה</Label>
              <Input
                id="companyName"
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">כתובת</Label>
              <Textarea
                id="address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingEmail">אימייל לחשבונית</Label>
              <Input
                id="billingEmail"
                type="email"
                value={editForm.billingEmail}
                onChange={(e) => setEditForm({ ...editForm, billingEmail: e.target.value })}
                placeholder="אופציונלי - אם ריק ישתמש באימייל הראשי"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "שומר..." : "שמירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Customer Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>דחיית לקוח</DialogTitle>
            <DialogDescription>האם אתה בטוח שברצונך לדחות לקוח זה?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">סיבת הדחייה (אופציונלי)</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="הזן סיבה לדחייה..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "דוחה..." : "דחייה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
            <DialogDescription>הוסף לקוח חדש למערכת</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">שם מלא *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="שם הלקוח"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">אימייל *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">טלפון *</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="050-0000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-company">שם חברה</Label>
              <Input
                id="create-company"
                value={createForm.companyName}
                onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                placeholder="שם החברה"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-address">כתובת</Label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="כתובת מלאה"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-billing-email">אימייל לחשבוניות</Label>
              <Input
                id="create-billing-email"
                type="email"
                value={createForm.billingEmail}
                onChange={(e) => setCreateForm({ ...createForm, billingEmail: e.target.value })}
                placeholder="billing@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateCustomer} disabled={createMutation.isPending}>
              {createMutation.isPending ? "יוצר..." : "צור לקוח"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
