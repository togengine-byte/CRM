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
      utils.customers.list.invalidate();
      utils.customers.stats.invalidate();
      utils.customers.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה באישור הלקוח: ${error.message}`);
    },
  });

  const rejectMutation = trpc.customers.reject.useMutation({
    onSuccess: () => {
      toast.success("הלקוח נדחה");
      utils.customers.list.invalidate();
      utils.customers.stats.invalidate();
      utils.customers.getById.invalidate();
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
      utils.customers.list.invalidate();
      utils.customers.getById.invalidate();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הלקוח: ${error.message}`);
    },
  });

  const assignPricelistMutation = trpc.customers.assignPricelist.useMutation({
    onSuccess: () => {
      toast.success("המחירון הוקצה ללקוח");
      utils.customers.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה בהקצאת המחירון: ${error.message}`);
    },
  });

  const removePricelistMutation = trpc.customers.removePricelist.useMutation({
    onSuccess: () => {
      toast.success("המחירון הוסר מהלקוח");
      utils.customers.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה בהסרת המחירון: ${error.message}`);
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
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name || "-"}</TableCell>
                    <TableCell>{customer.companyName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone || "-"}</TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(customer.id)}>
                            <Eye className="ml-2 h-4 w-4" />
                            צפייה בפרטים
                          </DropdownMenuItem>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>פרטי לקוח</SheetTitle>
            <SheetDescription>מידע מפורט על הלקוח</SheetDescription>
          </SheetHeader>
          {customerDetails && (
            <div className="mt-6 space-y-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">פרטים</TabsTrigger>
                  <TabsTrigger value="pricelists">מחירונים</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">סטטוס</span>
                    {getStatusBadge(customerDetails.status)}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">חברה</p>
                        <p className="font-medium">{customerDetails.companyName || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">אימייל</p>
                        <p className="font-medium">{customerDetails.email || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">טלפון</p>
                        <p className="font-medium">{customerDetails.phone || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">כתובת</p>
                        <p className="font-medium">{customerDetails.address || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">הצעות מחיר</p>
                        <p className="font-medium">{customerDetails.quotesCount}</p>
                      </div>
                    </div>
                  </div>
                  {customerDetails.status === "pending_approval" && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1"
                        onClick={() => handleApprove(customerDetails.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="ml-2 h-4 w-4" />
                        אישור
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleOpenRejectDialog(customerDetails.id)}
                      >
                        <XCircle className="ml-2 h-4 w-4" />
                        דחייה
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="pricelists" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>מחירונים מוקצים</Label>
                    {customerDetails.pricelists?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">אין מחירונים מוקצים</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDetails.pricelists?.map((pricelist) => (
                          <div
                            key={pricelist.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <span>{pricelist.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removePricelistMutation.mutate({
                                  customerId: customerDetails.id,
                                  pricelistId: pricelist.id,
                                })
                              }
                              disabled={removePricelistMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>הוסף מחירון</Label>
                    <Select
                      onValueChange={(value) =>
                        assignPricelistMutation.mutate({
                          customerId: customerDetails.id,
                          pricelistId: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מחירון" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricelists
                          ?.filter(
                            (p) =>
                              !customerDetails.pricelists?.some((cp) => cp.id === p.id)
                          )
                          .map((pricelist) => (
                            <SelectItem key={pricelist.id} value={pricelist.id.toString()}>
                              {pricelist.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
    </div>
  );
}
