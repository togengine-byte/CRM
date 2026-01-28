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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  PackageCheck,
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  Truck,
  Package,
  Building2,
  Search,
} from "lucide-react";

interface Job {
  id: number;
  quoteId: number;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  supplierName: string;
  supplierCompany?: string;
  productName: string;
  sizeName?: string;
  quantity: number;
  pricePerUnit: string;
  status: string;
  supplierReadyAt?: string;
  createdAt: string;
  totalJobPrice?: string;
}

export default function ReadyForPickup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const utils = trpc.useUtils();

  // Get all jobs and filter for ready status
  const { data: allJobs, isLoading, refetch } = trpc.jobs.list.useQuery();
  
  // Filter for ready status only
  const jobs = allJobs?.filter((job: Job) => job.status === "ready") || [];

  // Update job status mutation
  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("העבודה סומנה כנאספה בהצלחה");
      utils.jobs.list.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה בעדכון סטטוס: " + error.message);
    },
  });

  // Filter jobs by search
  const filteredJobs = jobs.filter((job: Job) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      job.customerName?.toLowerCase().includes(search) ||
      job.supplierName?.toLowerCase().includes(search) ||
      job.productName?.toLowerCase().includes(search) ||
      job.id.toString().includes(search)
    );
  });

  // Get selected job details
  const jobDetails = selectedJobId ? jobs.find((j: Job) => j.id === selectedJobId) : null;

  // Handle mark as picked up - moves to "נאסף" category
  const handleMarkPickedUp = (jobId: number) => {
    updateStatus.mutate({
      jobId,
      status: "picked_up",
      notifyCustomer: true,
    });
  };

  // Calculate stats
  const totalValue = filteredJobs.reduce((sum: number, j: Job) => 
    sum + Number(j.totalJobPrice || j.quantity * Number(j.pricePerUnit) || 0), 0
  );
  const uniqueCustomers = new Set(filteredJobs.map((j: Job) => j.customerName)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-green-600" />
            ממתין לאיסוף
          </h1>
          <p className="text-muted-foreground">עבודות שהייצור הסתיים וממתינות לאיסוף מהספק</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="ml-2 h-4 w-4" />
          רענן
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ממתינות לאיסוף</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredJobs.length}
                </p>
              </div>
              <PackageCheck className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שווי כולל</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₪{totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">לקוחות ממתינים</p>
                <p className="text-2xl font-bold text-amber-600">
                  {uniqueCustomers}
                </p>
              </div>
              <User className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי לקוח, ספק, מוצר או מספר עבודה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
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
            <Truck className="h-5 w-5 text-green-600" />
            עבודות מוכנות לאיסוף
            {filteredJobs.length > 0 && (
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
              <PackageCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין עבודות ממתינות</h3>
              <p className="text-muted-foreground mt-1">כל העבודות המוכנות כבר נאספו</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מס׳</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">תאריך מוכנות</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job: Job) => (
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
                      <TableCell className="font-medium">{job.customerName || "-"}</TableCell>
                      <TableCell>{job.productName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{job.supplierName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {job.supplierReadyAt ? new Date(job.supplierReadyAt).toLocaleDateString("he-IL") : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkPickedUp(job.id);
                          }}
                          disabled={updateStatus.isPending}
                        >
                          <Truck className="h-4 w-4 ml-1" />
                          נאסף
                        </Button>
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
                                </div>
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                              <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                פרטי מוצר
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">מוצר</p>
                                  <p className="font-medium">{jobDetails.productName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">גודל</p>
                                  <p className="font-medium">{jobDetails.sizeName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">כמות</p>
                                  <p className="font-medium text-xl text-purple-700">{jobDetails.quantity || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">סה״כ</p>
                                  <p className="font-bold text-xl text-green-600">
                                    ₪{Number(jobDetails.totalJobPrice || jobDetails.quantity * Number(jobDetails.pricePerUnit) || 0).toLocaleString()}
                                  </p>
                                </div>
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
    </div>
  );
}
