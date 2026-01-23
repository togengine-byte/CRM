import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type JobStatus = "in_production" | "ready" | "picked_up" | "delivered" | "all";

interface Job {
  id: number;
  quoteId: number;
  customerName: string;
  supplierName: string;
  productName: string;
  status: string;
  createdAt: string;
  expectedReadyAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export default function Jobs() {
  const [statusFilter, setStatusFilter] = useState<JobStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  // Fetch jobs from supplier_jobs table
  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery();
  
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
    switch (status) {
      case "in_production":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Factory className="ml-1 h-3 w-3" />
            בייצור
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Package className="ml-1 h-3 w-3" />
            מוכן לאיסוף
          </Badge>
        );
      case "picked_up":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Truck className="ml-1 h-3 w-3" />
            נאסף
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
            <CheckCircle className="ml-1 h-3 w-3" />
            נמסר
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="ml-1 h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  const handleRowClick = (jobId: number) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const handleUpdateStatus = (job: Job, status: string) => {
    setSelectedJob(job);
    setNewStatus(status);
    setIsStatusDialogOpen(true);
  };

  const confirmStatusUpdate = () => {
    if (selectedJob && newStatus) {
      updateStatusMutation.mutate({
        jobId: selectedJob.id,
        status: newStatus as 'in_production' | 'ready' | 'picked_up' | 'delivered',
      });
      setIsStatusDialogOpen(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_production": return "בייצור";
      case "ready": return "מוכן לאיסוף";
      case "picked_up": return "נאסף";
      case "delivered": return "נמסר";
      default: return status;
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">עבודות בביצוע</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            מעקב אחר עבודות בשלבי ייצור ומשלוח
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
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
                <SelectValue placeholder="סינון לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="in_production">בייצור</SelectItem>
                <SelectItem value="ready">מוכן לאיסוף</SelectItem>
                <SelectItem value="picked_up">נאסף</SelectItem>
                <SelectItem value="delivered">נמסר</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              רשימת עבודות
            </CardTitle>
            {filteredJobs && filteredJobs.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal">
                {filteredJobs.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredJobs || filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין עבודות</h3>
              <p className="text-muted-foreground mt-1">לא נמצאו עבודות בביצוע</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map((job: Job) => (
                <div key={job.id}>
                  <div
                    onClick={() => handleRowClick(job.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                      expandedJobId === job.id
                        ? "bg-accent border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {expandedJobId === job.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-bold">#{job.id}</span>
                      </div>
                      <div>
                        <p className="font-medium">{job.customerName || "לקוח לא מזוהה"}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.productName} • {job.supplierName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(job.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedJobId === job.id && (
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-t-0 rounded-t-none space-y-4">
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">לקוח</p>
                            <p className="text-sm font-medium">{job.customerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">ספק</p>
                            <p className="text-sm font-medium">{job.supplierName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">מוצר</p>
                            <p className="text-sm font-medium">{job.productName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">תאריך יצירה</p>
                            <p className="text-sm font-medium">
                              {new Date(job.createdAt).toLocaleDateString("he-IL")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        {job.status === "in_production" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(job, "ready");
                            }}
                          >
                            <Package className="ml-1 h-3 w-3" />
                            סמן כמוכן
                          </Button>
                        )}
                        {job.status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(job, "picked_up");
                            }}
                          >
                            <Truck className="ml-1 h-3 w-3" />
                            סמן כנאסף
                          </Button>
                        )}
                        {job.status === "picked_up" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(job, "delivered");
                            }}
                          >
                            <CheckCircle className="ml-1 h-3 w-3" />
                            סמן כנמסר
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עדכון סטטוס עבודה</DialogTitle>
            <DialogDescription>
              האם לעדכן את סטטוס העבודה #{selectedJob?.id} ל{getStatusLabel(newStatus)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={confirmStatusUpdate}>
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
