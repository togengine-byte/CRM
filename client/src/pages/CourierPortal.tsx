import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Truck,
  Search,
  Package,
  MapPin,
  Phone,
  CheckCircle,
  RefreshCw,
  Building2,
  User,
  Filter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ReadyJob | null>(null);
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

  // Get job details for expanded row
  const jobDetails = selectedJobId ? (jobs as any[]).find((j: any) => j.id === selectedJobId) : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6" />
            פורטל שליחים
          </h1>
          <p className="text-muted-foreground">ניהול משלוחים ואיסופים</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">נמסרו</p>
                <p className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
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
                placeholder="חיפוש לפי מוצר, ספק או לקוח..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[180px]">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">ממתינים לאיסוף</SelectItem>
                <SelectItem value="in_transit">בדרך</SelectItem>
                <SelectItem value="delivered">נמסרו</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            עבודות משלוח
            {filteredJobs && (
              <Badge variant="secondary" className="mr-2">
                {filteredJobs.length} עבודות
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">כמות</TableHead>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job: any) => (
                  <>
                    <TableRow
                      key={job.id}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setIsDetailsOpen(selectedJobId === job.id ? !isDetailsOpen : true);
                      }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>{job.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.productName || "מוצר"}</div>
                          <div className="text-sm text-muted-foreground">
                            {job.sizeName} {job.dimensions ? `(${job.dimensions})` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{job.quantity}</TableCell>
                      <TableCell className="font-medium">{job.supplierName || "-"}</TableCell>
                      <TableCell className="font-medium">{job.customerName || "-"}</TableCell>
                      <TableCell>{getJobStatus(job)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
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
                    {/* Expanded Details Row */}
                    {isDetailsOpen && selectedJobId === job.id && jobDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7}>
                          <div className="p-6 space-y-6">
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div>
                                <p className="text-sm text-muted-foreground">מוצר</p>
                                <p className="font-medium flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  {jobDetails.productName || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">גודל</p>
                                <p className="font-medium">
                                  {jobDetails.sizeName} {jobDetails.dimensions ? `(${jobDetails.dimensions})` : ''}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">כמות</p>
                                <p className="font-medium">{jobDetails.quantity}</p>
                              </div>
                            </div>

                            {/* Pickup Info */}
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                פרטי איסוף (ספק)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-blue-600">שם</p>
                                  <p className="font-medium text-blue-900">{jobDetails.supplierName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-blue-600">כתובת</p>
                                  <p className="font-medium text-blue-900 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {jobDetails.supplierAddress || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-600">טלפון</p>
                                  <p className="font-medium text-blue-900 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {jobDetails.supplierPhone || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Delivery Info */}
                            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                              <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                פרטי מסירה (לקוח)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-green-600">שם</p>
                                  <p className="font-medium text-green-900">{jobDetails.customerName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-green-600">כתובת</p>
                                  <p className="font-medium text-green-900 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {jobDetails.customerAddress || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-green-600">טלפון</p>
                                  <p className="font-medium text-green-900 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {jobDetails.customerPhone || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 border-t">
                              {!jobDetails.pickedUp && (
                                <Button
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => openConfirmDialog(jobDetails, "pickup")}
                                >
                                  <Package className="ml-2 h-4 w-4" />
                                  סמן כנאסף
                                </Button>
                              )}
                              {jobDetails.pickedUp && !jobDetails.delivered && (
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => openConfirmDialog(jobDetails, "deliver")}
                                >
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  סמן כנמסר
                                </Button>
                              )}
                              {jobDetails.delivered && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-base py-2 px-4">
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  העבודה הושלמה
                                </Badge>
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

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "pickup" ? "אישור איסוף" : "אישור מסירה"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "pickup" 
                ? `האם לסמן את העבודה #${selectedJob?.id} כנאספה מהספק?`
                : `האם לסמן את העבודה #${selectedJob?.id} כנמסרה ללקוח?`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="py-4 space-y-2 text-sm">
              <p><strong>מוצר:</strong> {selectedJob.productName}</p>
              <p><strong>כמות:</strong> {selectedJob.quantity}</p>
              {confirmAction === "pickup" && (
                <p><strong>ספק:</strong> {selectedJob.supplierName}</p>
              )}
              {confirmAction === "deliver" && (
                <p><strong>לקוח:</strong> {selectedJob.customerName}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleConfirm}
              className={confirmAction === "pickup" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
              disabled={pickupMutation.isPending || deliverMutation.isPending}
            >
              {(pickupMutation.isPending || deliverMutation.isPending) ? "מעדכן..." : "אישור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
