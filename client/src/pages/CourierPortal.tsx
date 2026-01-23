import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Truck,
  Search,
  Package,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Navigation,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReadyJob {
  id: number;
  quoteId: number;
  productName: string;
  sizeName: string;
  dimensions?: string | null;
  quantity: number;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  pickedUp: boolean;
  pickedUpAt: string | null;
  delivered: boolean;
  deliveredAt: string | null;
}

export default function CourierPortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<ReadyJob | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pickup" | "deliver" | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const utils = trpc.useUtils();

  // Queries
  const { data: jobs = [], isLoading, refetch } = trpc.courier.readyJobs.useQuery();
  const { data: stats } = trpc.courier.stats.useQuery();

  // Mutations
  const pickupMutation = trpc.courier.markPickedUp.useMutation({
    onSuccess: () => {
      toast.success("העבודה סומנה כנאספה!");
      utils.courier.readyJobs.invalidate();
      utils.courier.stats.invalidate();
      setIsConfirmDialogOpen(false);
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
    },
  });

  const deliverMutation = trpc.courier.markDelivered.useMutation({
    onSuccess: () => {
      toast.success("העבודה סומנה כנמסרה!");
      utils.courier.readyJobs.invalidate();
      utils.courier.stats.invalidate();
      setIsConfirmDialogOpen(false);
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast.error(`שגיאה: ${error.message}`);
    },
  });

  const handlePickup = (jobId: number) => {
    pickupMutation.mutate({ quoteItemId: jobId });
  };

  const handleDeliver = (jobId: number) => {
    deliverMutation.mutate({ quoteItemId: jobId });
  };

  const openConfirmDialog = (job: ReadyJob, action: "pickup" | "deliver") => {
    setSelectedJob(job);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedJob || !confirmAction) return;
    
    if (confirmAction === "pickup") {
      handlePickup(selectedJob.id);
    } else {
      handleDeliver(selectedJob.id);
    }
  };

  const openDetails = (job: ReadyJob) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  // Filter jobs based on tab and search
  const filteredJobs = (jobs as any[]).filter((job: any) => {
    const matchesSearch = !searchQuery || 
      job.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "pending") {
      return matchesSearch && !job.pickedUp;
    } else if (activeTab === "in_transit") {
      return matchesSearch && job.pickedUp && !job.delivered;
    } else if (activeTab === "delivered") {
      return matchesSearch && job.delivered;
    }
    return matchesSearch;
  });

  const getJobStatus = (job: ReadyJob) => {
    if (job.delivered) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">נמסר</Badge>;
    } else if (job.pickedUp) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">בדרך</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין לאיסוף</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            פורטל שליחים
          </h1>
          <p className="text-muted-foreground">ניהול משלוחים ואיסופים</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ml-2 h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינים לאיסוף</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">בדרך</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.pickedUp || 0}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נמסרו היום</p>
                <p className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי מוצר, ספק או לקוח..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Jobs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>עבודות משלוח</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pending">
                ממתינים ({(jobs as any[]).filter((j: any) => !j.pickedUp).length})
              </TabsTrigger>
              <TabsTrigger value="in_transit">
                בדרך ({(jobs as any[]).filter((j: any) => j.pickedUp && !j.delivered).length})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                נמסרו ({(jobs as any[]).filter((j: any) => j.delivered).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">אין עבודות</h3>
                  <p className="text-muted-foreground mt-1">
                    {activeTab === "pending" && "אין עבודות הממתינות לאיסוף"}
                    {activeTab === "in_transit" && "אין עבודות בדרך"}
                    {activeTab === "delivered" && "אין עבודות שנמסרו"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">מוצר</TableHead>
                      <TableHead className="text-right">כמות</TableHead>
                      <TableHead className="text-right">ספק (איסוף)</TableHead>
                      <TableHead className="text-right">לקוח (מסירה)</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{job.productName || "מוצר"}</div>
                            <div className="text-sm text-muted-foreground">{job.sizeName} {job.dimensions ? `(${job.dimensions})` : ''}</div>
                          </div>
                        </TableCell>
                        <TableCell>{job.quantity}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{job.supplierName || "-"}</div>
                            <div className="text-muted-foreground truncate max-w-[150px]">
                              {job.supplierAddress || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{job.customerName || "-"}</div>
                            <div className="text-muted-foreground truncate max-w-[150px]">
                              {job.customerAddress || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getJobStatus(job)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetails(job)}
                            >
                              פרטים
                            </Button>
                            {!job.pickedUp && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => openConfirmDialog(job, "pickup")}
                              >
                                אסוף
                              </Button>
                            )}
                            {job.pickedUp && !job.delivered && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openConfirmDialog(job, "deliver")}
                              >
                                מסור
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              פרטי משלוח
            </SheetTitle>
            <SheetDescription>
              הזמנה #{selectedJob?.quoteId}
            </SheetDescription>
          </SheetHeader>

          {selectedJob && (
            <div className="mt-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סטטוס:</span>
                {getJobStatus(selectedJob)}
              </div>

              {/* Product Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    פרטי מוצר
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">מוצר:</span>
                    <span className="font-medium">{selectedJob.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">גודל:</span>
                    <span>{selectedJob.sizeName} {selectedJob.dimensions ? `(${selectedJob.dimensions})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">כמות:</span>
                    <span>{selectedJob.quantity}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pickup Location */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                    <Building2 className="h-4 w-4" />
                    נקודת איסוף (ספק)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.supplierName || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedJob.supplierAddress || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedJob.supplierPhone}`} className="text-blue-600 hover:underline">
                      {selectedJob.supplierPhone || "-"}
                    </a>
                  </div>
                  {selectedJob.supplierAddress && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedJob.supplierAddress)}`, '_blank')}
                    >
                      <Navigation className="h-4 w-4 ml-2" />
                      נווט ב-Waze
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Location */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <MapPin className="h-4 w-4" />
                    נקודת מסירה (לקוח)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.customerName || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedJob.customerAddress || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedJob.customerPhone}`} className="text-green-600 hover:underline">
                      {selectedJob.customerPhone || "-"}
                    </a>
                  </div>
                  {selectedJob.customerAddress && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedJob.customerAddress)}`, '_blank')}
                    >
                      <Navigation className="h-4 w-4 ml-2" />
                      נווט ב-Waze
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              {(selectedJob.pickedUpAt || selectedJob.deliveredAt) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      ציר זמן
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedJob.pickedUpAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span>נאסף: {new Date(selectedJob.pickedUpAt).toLocaleString("he-IL")}</span>
                      </div>
                    )}
                    {selectedJob.deliveredAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>נמסר: {new Date(selectedJob.deliveredAt).toLocaleString("he-IL")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {!selectedJob.pickedUp && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => openConfirmDialog(selectedJob, "pickup")}
                    disabled={pickupMutation.isPending}
                  >
                    <Package className="h-4 w-4 ml-2" />
                    סמן כנאסף
                  </Button>
                )}
                {selectedJob.pickedUp && !selectedJob.delivered && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => openConfirmDialog(selectedJob, "deliver")}
                    disabled={deliverMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    סמן כנמסר
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "pickup" ? "אישור איסוף" : "אישור מסירה"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "pickup" 
                ? `האם אספת את המשלוח מ-${selectedJob?.supplierName}?`
                : `האם מסרת את המשלוח ל-${selectedJob?.customerName}?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              className={confirmAction === "pickup" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
              onClick={handleConfirm}
              disabled={pickupMutation.isPending || deliverMutation.isPending}
            >
              {(pickupMutation.isPending || deliverMutation.isPending) ? "מעדכן..." : "אשר"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
