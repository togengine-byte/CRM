import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  Factory,
  Package,
  Truck,
  CheckCircle,
  Clock,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  FileWarning,
  Mail,
  MailX,
} from "lucide-react";
import { cn } from "@/lib/utils";

type JobStatus = "pending" | "in_progress" | "in_production" | "ready" | "picked_up" | "delivered" | "all";

const allStatuses = [
  { value: "pending", label: "ממתין", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { value: "in_progress", label: "בביצוע", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "ready", label: "מוכן לאיסוף", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "picked_up", label: "נאסף", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "delivered", label: "נמסר", color: "bg-teal-50 text-teal-700 border-teal-200" },
];

interface FileWarning {
  fileName: string;
  warnings: string[];
  passed: boolean;
}

interface Job {
  id: number;
  quoteId: number;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  supplierName: string;
  supplierCompany?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  productName: string;
  productDescription?: string;
  productCategory?: string;
  sizeName?: string;
  dimensions?: string;
  sizeBasePrice?: string;
  sizeQuantityPrice?: string;
  sizeQuantityAmount?: number;
  quantity?: number;
  pricePerUnit?: string;
  totalJobPrice?: string;
  promisedDeliveryDays?: number;
  quoteTotal?: string;
  quoteFinalValue?: string;
  quoteStatus?: string;
  status: string;
  isAccepted?: boolean;
  acceptedAt?: string;
  isCancelled?: boolean;
  cancelledReason?: string;
  createdAt: string;
  updatedAt?: string;
  expectedReadyAt?: string;
  supplierReadyAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  fileValidationWarnings?: FileWarning[];
}

export default function Jobs() {
  // Default to showing only in_progress jobs (עבודות בביצוע)
  const [statusFilter, setStatusFilter] = useState<JobStatus>("in_progress");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  // Fetch jobs from supplier_jobs table
  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery();
  
  // Fetch email setting
  const { data: emailSetting } = trpc.settings.emailOnStatusChange.get.useQuery();
  
  // Mutation for updating job status
  const updateStatusMutation = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(`סטטוס העבודה עודכן בהצלחה`);
      refetch();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון סטטוס: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = allStatuses.find(s => s.value === status);
    const Icon = status === "pending" ? Clock : 
                 status === "in_progress" ? Factory :
                 status === "ready" ? Package :
                 status === "picked_up" ? Truck :
                 status === "delivered" ? CheckCircle : Clock;
    
    return (
      <Badge variant="outline" className={statusConfig?.color || "bg-gray-50 text-gray-700 border-gray-200"}>
        <Icon className="ml-1 h-3 w-3" />
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const confirmStatusUpdate = (withEmail: boolean = false) => {
    if (selectedJob && newStatus) {
      const shouldSendEmail = emailSetting === 'auto' ? true : 
                              emailSetting === 'never' ? false : withEmail;
      updateStatusMutation.mutate({
        jobId: selectedJob.id,
        status: newStatus as 'pending' | 'in_progress' | 'ready' | 'picked_up' | 'delivered',
        notifyCustomer: shouldSendEmail,
      });
      setIsStatusDialogOpen(false);
    }
  };

  const handleStatusChange = (job: Job, status: string) => {
    setSelectedJob(job);
    setNewStatus(status);
    
    // If setting is 'auto' or 'never', update directly without dialog
    if (emailSetting === 'auto' || emailSetting === 'never') {
      updateStatusMutation.mutate({
        jobId: job.id,
        status: status as 'pending' | 'in_progress' | 'ready' | 'picked_up' | 'delivered',
        notifyCustomer: emailSetting === 'auto',
      });
    } else {
      // Show dialog to ask about email
      setIsStatusDialogOpen(true);
    }
  };

  const getStatusLabel = (status: string) => {
    const found = allStatuses.find(s => s.value === status);
    return found?.label || status;
  };

  // Get stats
  const stats = {
    total: jobs?.length || 0,
    pending: jobs?.filter((j: Job) => j.status === "pending").length || 0,
    inProgress: jobs?.filter((j: Job) => j.status === "in_progress").length || 0,
    ready: jobs?.filter((j: Job) => j.status === "ready").length || 0,
    pickedUp: jobs?.filter((j: Job) => j.status === "picked_up").length || 0,
    delivered: jobs?.filter((j: Job) => j.status === "delivered").length || 0,
  };

  // Filter jobs
  const filteredJobs = jobs?.filter((job: Job) => {
    // Status filter
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        job.customerName?.toLowerCase().includes(search) ||
        job.supplierName?.toLowerCase().includes(search) ||
        job.productName?.toLowerCase().includes(search) ||
        job.id.toString().includes(search)
      );
    }
    return true;
  });

  // Get selected job details
  const jobDetails = selectedJobId ? jobs?.find((j: Job) => j.id === selectedJobId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">עבודות בביצוע</h1>
          <p className="text-muted-foreground">מעקב אחר עבודות בשלבי ייצור ומשלוח</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה״כ עבודות</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">בביצוע</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
              </div>
              <Factory className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">מוכנות לאיסוף</p>
                <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
              </div>
              <Package className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נאספו</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pickedUp}</p>
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
                <p className="text-2xl font-bold text-teal-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-teal-500/50" />
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
                placeholder="חיפוש לפי לקוח, ספק או מוצר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as JobStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="ml-2 h-4 w-4" />
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
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
            <Briefcase className="h-5 w-5" />
            רשימת עבודות
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
          ) : filteredJobs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין עבודות</h3>
              <p className="text-muted-foreground mt-1">לא נמצאו עבודות התואמות לחיפוש</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך יצירה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs?.map((job: Job) => (
                  <>
                    <TableRow
                      key={job.id}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setIsDetailsOpen(selectedJobId === job.id ? !isDetailsOpen : true);
                      }}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        !job.isAccepted && "opacity-50 bg-gray-100"
                      )}
                    >
                      <TableCell>{job.id}</TableCell>
                      <TableCell className="font-medium">{job.customerName || "-"}</TableCell>
                      <TableCell>{job.productName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{job.supplierName || "-"}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                    </TableRow>
                    {/* Expanded Details Row */}
                    {isDetailsOpen && selectedJobId === job.id && jobDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={6}>
                          <div className="p-6 space-y-6">
                            {/* Customer & Supplier Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Customer Info */}
                              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  פרטי לקוח
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">שם</p>
                                    <p className="font-medium">{jobDetails.customerName || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">חברה</p>
                                    <p className="font-medium">{jobDetails.customerCompany || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">טלפון</p>
                                    <p className="font-medium">{jobDetails.customerPhone || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">אימייל</p>
                                    <p className="font-medium text-xs">{jobDetails.customerEmail || "-"}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Supplier Info */}
                              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  פרטי ספק
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">שם</p>
                                    <p className="font-medium">{jobDetails.supplierName || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">חברה</p>
                                    <p className="font-medium">{jobDetails.supplierCompany || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">טלפון</p>
                                    <p className="font-medium">{jobDetails.supplierPhone || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">ימי אספקה</p>
                                    <p className="font-medium">{jobDetails.promisedDeliveryDays || "-"} ימים</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Product & Order Details */}
                            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                              <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                פרטי מוצר והזמנה
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">מוצר</p>
                                  <p className="font-medium">{jobDetails.productName || "-"}</p>
                                  {jobDetails.productCategory && (
                                    <p className="text-xs text-muted-foreground">קטגוריה: {jobDetails.productCategory}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">גודל</p>
                                  <p className="font-medium">{jobDetails.sizeName || "-"}</p>
                                  {jobDetails.dimensions && (
                                    <p className="text-xs text-muted-foreground">מידות: {jobDetails.dimensions}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">כמות</p>
                                  <p className="font-medium text-xl text-purple-700">{jobDetails.quantity || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">מחיר ליחידה</p>
                                  <p className="font-medium text-lg text-green-600">
                                    {jobDetails.pricePerUnit ? `₪${parseFloat(jobDetails.pricePerUnit).toFixed(2)}` : "-"}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Pricing Summary */}
                              <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">סה״כ עבודה זו</p>
                                  <p className="font-bold text-xl text-green-600">
                                    {jobDetails.totalJobPrice ? `₪${parseFloat(jobDetails.totalJobPrice).toFixed(2)}` : 
                                     (jobDetails.quantity && jobDetails.pricePerUnit ? 
                                       `₪${(jobDetails.quantity * parseFloat(jobDetails.pricePerUnit)).toFixed(2)}` : "-")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">סה״כ הצעת מחיר</p>
                                  <p className="font-medium text-lg text-primary">
                                    {jobDetails.quoteFinalValue ? `₪${parseFloat(jobDetails.quoteFinalValue).toFixed(2)}` : 
                                     (jobDetails.quoteTotal ? `₪${parseFloat(jobDetails.quoteTotal).toFixed(2)}` : "-")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">מס׳ הצעת מחיר</p>
                                  <p className="font-medium">{jobDetails.quoteId}</p>
                                </div>
                              </div>
                            </div>

                            {/* Status & Dates */}
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                סטטוס ותאריכים
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">סטטוס נוכחי</p>
                                  <div className="mt-1">{getStatusBadge(jobDetails.status)}</div>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">תאריך יצירה</p>
                                  <p className="font-medium">
                                    {new Date(jobDetails.createdAt).toLocaleDateString("he-IL")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">ימי אספקה מובטחים</p>
                                  <p className="font-medium">{jobDetails.promisedDeliveryDays || "-"} ימים</p>
                                </div>
                                {jobDetails.supplierReadyAt && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">מוכן בתאריך</p>
                                    <p className="font-medium text-green-600">
                                      {new Date(jobDetails.supplierReadyAt).toLocaleDateString("he-IL")}
                                    </p>
                                  </div>
                                )}
                                {jobDetails.pickedUpAt && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">נאסף בתאריך</p>
                                    <p className="font-medium text-blue-600">
                                      {new Date(jobDetails.pickedUpAt).toLocaleDateString("he-IL")}
                                    </p>
                                  </div>
                                )}
                                {jobDetails.deliveredAt && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">נמסר בתאריך</p>
                                    <p className="font-medium text-teal-600">
                                      {new Date(jobDetails.deliveredAt).toLocaleDateString("he-IL")}
                                  </p>
                                </div>
                              )}
                              </div>
                            </div>

                            {/* File Validation Warnings */}
                            {jobDetails.fileValidationWarnings && jobDetails.fileValidationWarnings.length > 0 && (
                              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  <span className="font-medium text-amber-800">אזהרות לקבצים להדפסה</span>
                                </div>
                                <div className="space-y-2">
                                  {jobDetails.fileValidationWarnings.map((fileWarning: any, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      <div className="flex items-center gap-1 text-amber-700 font-medium">
                                        <FileWarning className="h-3 w-3" />
                                        {fileWarning.fileName}
                                      </div>
                                      <ul className="mr-5 mt-1 space-y-0.5">
                                        {fileWarning.warnings.map((warning: string, wIdx: number) => (
                                          <li key={wIdx} className="text-amber-600 text-xs">• {warning}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Status Change */}
                            <div className="flex items-center gap-3 pt-4 border-t">
                              <span className="text-sm text-muted-foreground">שנה סטטוס:</span>
                              <Select
                                value={jobDetails.status}
                                onValueChange={(value) => {
                                  if (value !== jobDetails.status) {
                                    handleStatusChange(jobDetails, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allStatuses.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <span className={cn(
                                        "flex items-center gap-2",
                                        s.value === jobDetails.status && "font-medium"
                                      )}>
                                        {s.value === "pending" && <Clock className="h-3 w-3" />}
                                        {s.value === "in_progress" && <Factory className="h-3 w-3" />}
                                        {s.value === "ready" && <Package className="h-3 w-3" />}
                                        {s.value === "picked_up" && <Truck className="h-3 w-3" />}
                                        {s.value === "delivered" && <CheckCircle className="h-3 w-3" />}
                                        {s.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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

      {/* Status Update Dialog with Email Option */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עדכון סטטוס עבודה</DialogTitle>
            <DialogDescription>
              עדכון סטטוס עבודה {selectedJob?.id} ל{getStatusLabel(newStatus)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              האם לשלוח עדכון במייל ללקוח?
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              ביטול
            </Button>
            <Button 
              variant="outline"
              onClick={() => confirmStatusUpdate(false)}
              className="w-full sm:w-auto gap-2"
            >
              <MailX className="h-4 w-4" />
              עדכן ללא מייל
            </Button>
            <Button 
              onClick={() => confirmStatusUpdate(true)}
              className="w-full sm:w-auto gap-2"
            >
              <Mail className="h-4 w-4" />
              עדכן ושלח מייל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
