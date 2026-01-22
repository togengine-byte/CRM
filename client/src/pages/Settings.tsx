import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  FileCheck, 
  Plus, 
  Pencil, 
  Trash2,
  Star,
  Shield,
  Palette,
  FileType,
  Maximize,
  HardDrive,
  Truck,
  Save,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/_core/hooks/useAuth";

// ==================== SUPPLIER WEIGHTS SETTINGS ====================
function SupplierWeightsSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: weights, isLoading } = trpc.settings.supplierWeights.get.useQuery();
  
  const [localWeights, setLocalWeights] = useState({
    price: 40,
    rating: 30,
    deliveryTime: 20,
    reliability: 10,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when data loads
  useState(() => {
    if (weights) {
      setLocalWeights(weights);
    }
  });

  // Sync with server data
  if (weights && !hasChanges) {
    if (localWeights.price !== weights.price ||
        localWeights.rating !== weights.rating ||
        localWeights.deliveryTime !== weights.deliveryTime ||
        localWeights.reliability !== weights.reliability) {
      setLocalWeights(weights);
    }
  }

  const updateWeights = trpc.settings.supplierWeights.update.useMutation({
    onSuccess: () => {
      toast.success("משקלי המלצות ספקים עודכנו בהצלחה");
      utils.settings.supplierWeights.get.invalidate();
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("שגיאה: " + error.message);
    },
  });

  const handleWeightChange = (key: keyof typeof localWeights, value: number) => {
    setLocalWeights(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const totalWeight = localWeights.price + localWeights.rating + localWeights.deliveryTime + localWeights.reliability;
  const isValid = totalWeight === 100;

  const handleSave = () => {
    if (!isValid) {
      toast.error(`סכום המשקלים חייב להיות 100% (כרגע: ${totalWeight}%)`);
      return;
    }
    updateWeights.mutate(localWeights);
  };

  const handleReset = () => {
    if (weights) {
      setLocalWeights(weights);
      setHasChanges(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const weightItems = [
    { key: 'price' as const, label: 'מחיר', description: 'ספק זול יותר מקבל ציון גבוה יותר', color: 'bg-green-500' },
    { key: 'rating' as const, label: 'דירוג', description: 'ממוצע דירוגים מעסקאות קודמות', color: 'bg-yellow-500' },
    { key: 'deliveryTime' as const, label: 'זמן אספקה', description: 'ספק מהיר יותר מקבל ציון גבוה', color: 'bg-blue-500' },
    { key: 'reliability' as const, label: 'אמינות', description: 'אחוז עבודות שנמסרו בזמן', color: 'bg-purple-500' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-500">טוען...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          משקלי המלצות ספקים
        </CardTitle>
        <CardDescription>
          הגדר את המשקל של כל קריטריון בחישוב המלצות ספקים. סה"כ המשקלים חייב להיות 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total indicator */}
        <div className={`p-4 rounded-lg border-2 ${
          isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">סה"כ משקלים:</span>
            <span className={`text-2xl font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalWeight}%
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600 mt-1">
              {totalWeight > 100 ? `עודף ${totalWeight - 100}%` : `חסר ${100 - totalWeight}%`}
            </p>
          )}
        </div>

        {/* Weight sliders */}
        <div className="space-y-6">
          {weightItems.map(item => (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{item.label}</Label>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={localWeights[item.key]}
                    onChange={(e) => handleWeightChange(item.key, parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    min={0}
                    max={100}
                    disabled={!isAdmin}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[localWeights[item.key]]}
                  onValueChange={([value]) => handleWeightChange(item.key, value)}
                  max={100}
                  step={5}
                  className="flex-1"
                  disabled={!isAdmin}
                />
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Visual breakdown */}
        <div className="space-y-2">
          <Label>חלוקה ויזואלית</Label>
          <div className="h-8 rounded-lg overflow-hidden flex">
            {weightItems.map(item => (
              <div
                key={item.key}
                className={`${item.color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                style={{ width: `${localWeights[item.key]}%` }}
              >
                {localWeights[item.key] >= 10 && `${localWeights[item.key]}%`}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {weightItems.map(item => (
              <div key={item.key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateWeights.isPending}
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              ביטול שינויים
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValid || updateWeights.isPending}
            >
              {updateWeights.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </div>
        )}

        {!isAdmin && (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>רק מנהל מערכת יכול לשנות הגדרות אלו</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== USER MANAGEMENT SETTINGS ====================
function UserManagementSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeUserTab, setActiveUserTab] = useState<'requests' | 'suppliers' | 'couriers'>('requests');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  // Queries
  const { data: signupRequests = [], isLoading: loadingRequests } = trpc.userManagement.signupRequests.list.useQuery({});
  const { data: suppliers = [], isLoading: loadingSuppliers } = trpc.userManagement.suppliers.useQuery();
  const { data: couriers = [], isLoading: loadingCouriers } = trpc.userManagement.couriers.useQuery();
  const { data: pendingUsers = [] } = trpc.userManagement.pendingUsers.useQuery({});

  // Mutations
  const approveRequestMutation = trpc.userManagement.signupRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("הבקשה אושרה והלקוח נוצר בהצלחה");
      utils.userManagement.signupRequests.list.invalidate();
      setSelectedRequest(null);
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const rejectRequestMutation = trpc.userManagement.signupRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("הבקשה נדחתה");
      utils.userManagement.signupRequests.list.invalidate();
      setSelectedRequest(null);
      setRejectNotes("");
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const approveUserMutation = trpc.userManagement.approve.useMutation({
    onSuccess: () => {
      toast.success("המשתמש אושר בהצלחה");
      utils.userManagement.suppliers.invalidate();
      utils.userManagement.couriers.invalidate();
      utils.userManagement.pendingUsers.invalidate();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const rejectUserMutation = trpc.userManagement.reject.useMutation({
    onSuccess: () => {
      toast.success("המשתמש נדחה");
      utils.userManagement.suppliers.invalidate();
      utils.userManagement.couriers.invalidate();
      utils.userManagement.pendingUsers.invalidate();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const deactivateUserMutation = trpc.userManagement.deactivate.useMutation({
    onSuccess: () => {
      toast.success("המשתמש הושבת");
      utils.userManagement.suppliers.invalidate();
      utils.userManagement.couriers.invalidate();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const reactivateUserMutation = trpc.userManagement.reactivate.useMutation({
    onSuccess: () => {
      toast.success("המשתמש הופעל מחדש");
      utils.userManagement.suppliers.invalidate();
      utils.userManagement.couriers.invalidate();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין</Badge>;
      case 'approved':
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">פעיל</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">נדחה</Badge>;
      case 'deactivated':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">מושבת</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingRequestsCount = signupRequests.filter((r: any) => r.status === 'pending').length;
  const pendingSuppliersCount = pendingUsers.filter((u: any) => u.role === 'supplier').length;
  const pendingCouriersCount = pendingUsers.filter((u: any) => u.role === 'courier').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setActiveUserTab('requests')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">בקשות לקוחות</p>
                <p className="text-2xl font-bold">{signupRequests.length}</p>
                {pendingRequestsCount > 0 && (
                  <p className="text-sm text-yellow-600">{pendingRequestsCount} ממתינות</p>
                )}
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setActiveUserTab('suppliers')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ספקים</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
                {pendingSuppliersCount > 0 && (
                  <p className="text-sm text-yellow-600">{pendingSuppliersCount} ממתינים</p>
                )}
              </div>
              <Package className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setActiveUserTab('couriers')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שליחים</p>
                <p className="text-2xl font-bold">{couriers.length}</p>
                {pendingCouriersCount > 0 && (
                  <p className="text-sm text-yellow-600">{pendingCouriersCount} ממתינים</p>
                )}
              </div>
              <Truck className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Tabs */}
      <Tabs value={activeUserTab} onValueChange={(v) => setActiveUserTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            בקשות לקוחות
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            ספקים
            {pendingSuppliersCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingSuppliersCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="couriers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            שליחים
            {pendingCouriersCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingCouriersCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Customer Signup Requests */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>בקשות הצעות מחיר מלקוחות</CardTitle>
              <CardDescription>ניהול בקשות מלקוחות חדשים שנרשמו דרך האתר</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : signupRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>אין בקשות חדשות</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">מייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">חברה</TableHead>
                      <TableHead className="text-right">קבצים</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signupRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell dir="ltr">{request.phone}</TableCell>
                        <TableCell>{request.companyName || '-'}</TableCell>
                        <TableCell>
                          {request.files?.length > 0 ? (
                            <Badge variant="secondary">{request.files.length} קבצים</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveRequestMutation.mutate({ id: request.id })}
                                  disabled={approveRequestMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                  }}
                                  disabled={rejectRequestMutation.isPending}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>ניהול ספקים</CardTitle>
              <CardDescription>אישור, דחייה והשבתת ספקים במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSuppliers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>אין ספקים במערכת</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">מייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">חברה</TableHead>
                      <TableHead className="text-right">דירוג</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier: any) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name || '-'}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell dir="ltr">{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.companyName || '-'}</TableCell>
                        <TableCell>
                          {supplier.ratedDealsCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              {(supplier.totalRatingPoints / supplier.ratedDealsCount).toFixed(1)}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {supplier.status === 'pending_approval' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveUserMutation.mutate({ userId: supplier.id })}
                                  disabled={approveUserMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => rejectUserMutation.mutate({ userId: supplier.id })}
                                  disabled={rejectUserMutation.isPending}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {supplier.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => deactivateUserMutation.mutate({ userId: supplier.id })}
                                disabled={deactivateUserMutation.isPending}
                              >
                                השבת
                              </Button>
                            )}
                            {supplier.status === 'deactivated' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => reactivateUserMutation.mutate({ userId: supplier.id })}
                                disabled={reactivateUserMutation.isPending}
                              >
                                הפעל
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Couriers */}
        <TabsContent value="couriers">
          <Card>
            <CardHeader>
              <CardTitle>ניהול שליחים</CardTitle>
              <CardDescription>אישור, דחייה והשבתת שליחים במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCouriers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : couriers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>אין שליחים במערכת</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">מייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">תאריך הצטרפות</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couriers.map((courier: any) => (
                      <TableRow key={courier.id}>
                        <TableCell className="font-medium">{courier.name || '-'}</TableCell>
                        <TableCell>{courier.email || '-'}</TableCell>
                        <TableCell dir="ltr">{courier.phone || '-'}</TableCell>
                        <TableCell>{getStatusBadge(courier.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(courier.createdAt).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {courier.status === 'pending_approval' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveUserMutation.mutate({ userId: courier.id })}
                                  disabled={approveUserMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => rejectUserMutation.mutate({ userId: courier.id })}
                                  disabled={rejectUserMutation.isPending}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {courier.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => deactivateUserMutation.mutate({ userId: courier.id })}
                                disabled={deactivateUserMutation.isPending}
                              >
                                השבת
                              </Button>
                            )}
                            {courier.status === 'deactivated' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => reactivateUserMutation.mutate({ userId: courier.id })}
                                disabled={reactivateUserMutation.isPending}
                              >
                                הפעל
                              </Button>
                            )}
                          </div>
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

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי בקשה</DialogTitle>
            <DialogDescription>
              בקשת הצעת מחיר מלקוח חדש
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">שם</Label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">חברה</Label>
                  <p className="font-medium">{selectedRequest.companyName || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">מייל</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {selectedRequest.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">טלפון</Label>
                  <p className="font-medium flex items-center gap-2" dir="ltr">
                    <Phone className="h-4 w-4" />
                    {selectedRequest.phone}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">תיאור הבקשה</Label>
                <p className="p-3 bg-gray-50 rounded-lg">{selectedRequest.description}</p>
              </div>

              {selectedRequest.files?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">קבצים מצורפים</Label>
                  <div className="space-y-2">
                    {selectedRequest.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>הערות לדחייה (אופציונלי)</Label>
                    <Textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="סיבת הדחייה..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        rejectRequestMutation.mutate({ 
                          id: selectedRequest.id, 
                          notes: rejectNotes || undefined 
                        });
                      }}
                      disabled={rejectRequestMutation.isPending}
                      className="text-red-600"
                    >
                      <XCircle className="h-4 w-4 ml-2" />
                      דחה בקשה
                    </Button>
                    <Button
                      onClick={() => approveRequestMutation.mutate({ id: selectedRequest.id })}
                      disabled={approveRequestMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 ml-2" />
                      אשר וצור לקוח
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== MAIN SETTINGS COMPONENT ====================
export default function Settings() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minDpi: 300,
    maxDpi: undefined as number | undefined,
    allowedColorspaces: ["CMYK"],
    requiredBleedMm: 3,
    maxFileSizeMb: 100,
    allowedFormats: ["pdf", "ai", "eps", "tiff"],
    isDefault: false,
  });

  const utils = trpc.useUtils();
  
  const { data: profiles, isLoading } = trpc.validation.profiles.list.useQuery();
  
  const createProfile = trpc.validation.profiles.create.useMutation({
    onSuccess: () => {
      toast.success("פרופיל וולידציה נוצר בהצלחה");
      utils.validation.profiles.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("שגיאה ביצירת פרופיל: " + error.message);
    },
  });

  const updateProfile = trpc.validation.profiles.update.useMutation({
    onSuccess: () => {
      toast.success("פרופיל וולידציה עודכן בהצלחה");
      utils.validation.profiles.list.invalidate();
      setEditingProfile(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("שגיאה בעדכון פרופיל: " + error.message);
    },
  });

  const deleteProfile = trpc.validation.profiles.delete.useMutation({
    onSuccess: () => {
      toast.success("פרופיל וולידציה נמחק בהצלחה");
      utils.validation.profiles.list.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה במחיקת פרופיל: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      minDpi: 300,
      maxDpi: undefined,
      allowedColorspaces: ["CMYK"],
      requiredBleedMm: 3,
      maxFileSizeMb: 100,
      allowedFormats: ["pdf", "ai", "eps", "tiff"],
      isDefault: false,
    });
  };

  // Helper function to safely parse JSON arrays
  const parseArraySafe = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return [];
  };

  const handleEdit = (profile: any) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      minDpi: profile.minDpi,
      maxDpi: profile.maxDpi || undefined,
      allowedColorspaces: parseArraySafe(profile.allowedColorspaces),
      requiredBleedMm: profile.requiredBleedMm,
      maxFileSizeMb: profile.maxFileSizeMb,
      allowedFormats: parseArraySafe(profile.allowedFormats),
      isDefault: profile.isDefault,
    });
  };

  const handleSubmit = () => {
    if (editingProfile) {
      updateProfile.mutate({
        id: editingProfile.id,
        ...formData,
      });
    } else {
      createProfile.mutate(formData);
    }
  };

  const colorspaceOptions = ["CMYK", "RGB", "Grayscale", "LAB"];
  const formatOptions = ["pdf", "ai", "eps", "tiff", "psd", "jpg", "png"];

  const toggleColorspace = (cs: string) => {
    setFormData(prev => ({
      ...prev,
      allowedColorspaces: prev.allowedColorspaces.includes(cs)
        ? prev.allowedColorspaces.filter(c => c !== cs)
        : [...prev.allowedColorspaces, cs]
    }));
  };

  const toggleFormat = (fmt: string) => {
    setFormData(prev => ({
      ...prev,
      allowedFormats: prev.allowedFormats.includes(fmt)
        ? prev.allowedFormats.filter(f => f !== fmt)
        : [...prev.allowedFormats, fmt]
    }));
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-600 mt-1">ניהול הגדרות המערכת, משתמשים ופרופילי וולידציה</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[650px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            משתמשים
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            ספקים
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            וולידציה
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            אבטחה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {isAdmin ? (
            <UserManagementSettings />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>רק מנהל מערכת יכול לגשת להגדרות משתמשים</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <SupplierWeightsSettings />
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  פרופילי וולידציה
                </CardTitle>
                <CardDescription>
                  הגדר פרופילים לבדיקת קבצי הדפסה (DPI, מרחב צבע, גלישה)
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen || !!editingProfile} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateDialogOpen(false);
                  setEditingProfile(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    פרופיל חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfile ? "עריכת פרופיל וולידציה" : "יצירת פרופיל וולידציה חדש"}
                    </DialogTitle>
                    <DialogDescription>
                      הגדר את דרישות הקובץ לבדיקה אוטומטית
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">שם הפרופיל</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="לדוגמה: הדפסת אופסט"
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={formData.isDefault}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                          />
                          <Label>פרופיל ברירת מחדל</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">תיאור</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="תיאור קצר של הפרופיל..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Maximize className="h-4 w-4" />
                          DPI מינימלי
                        </Label>
                        <Input
                          type="number"
                          value={formData.minDpi}
                          onChange={(e) => setFormData(prev => ({ ...prev, minDpi: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Maximize className="h-4 w-4" />
                          DPI מקסימלי
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxDpi || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxDpi: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="ללא הגבלה"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          גודל מקסימלי (MB)
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxFileSizeMb}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMb: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        גלישה נדרשת (מ"מ)
                      </Label>
                      <Input
                        type="number"
                        value={formData.requiredBleedMm}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiredBleedMm: parseInt(e.target.value) || 0 }))}
                        className="w-32"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        מרחבי צבע מותרים
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {colorspaceOptions.map(cs => (
                          <Badge
                            key={cs}
                            variant={formData.allowedColorspaces.includes(cs) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleColorspace(cs)}
                          >
                            {cs}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileType className="h-4 w-4" />
                        פורמטים מותרים
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {formatOptions.map(fmt => (
                          <Badge
                            key={fmt}
                            variant={formData.allowedFormats.includes(fmt) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFormat(fmt)}
                          >
                            .{fmt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingProfile(null);
                      resetForm();
                    }}>
                      ביטול
                    </Button>
                    <Button onClick={handleSubmit} disabled={createProfile.isPending || updateProfile.isPending}>
                      {createProfile.isPending || updateProfile.isPending ? (
                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      ) : null}
                      {editingProfile ? "עדכן פרופיל" : "צור פרופיל"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="mr-2 text-gray-500">טוען פרופילים...</span>
                </div>
              ) : !profiles || profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>אין פרופילי וולידציה</p>
                  <p className="text-sm">צור פרופיל חדש להגדרת דרישות קבצים</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">DPI</TableHead>
                      <TableHead className="text-right">מרחבי צבע</TableHead>
                      <TableHead className="text-right">גלישה</TableHead>
                      <TableHead className="text-right">פורמטים</TableHead>
                      <TableHead className="text-right">ברירת מחדל</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile: any) => {
                      const colorspaces = parseArraySafe(profile.allowedColorspaces);
                      const formats = parseArraySafe(profile.allowedFormats);
                      
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{profile.name}</p>
                              {profile.description && (
                                <p className="text-sm text-gray-500">{profile.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {profile.minDpi}
                            {profile.maxDpi ? `-${profile.maxDpi}` : "+"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {colorspaces.map((cs: string) => (
                                <Badge key={cs} variant="secondary" className="text-xs">
                                  {cs}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{profile.requiredBleedMm}מ"מ</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formats.slice(0, 3).map((fmt: string) => (
                                <Badge key={fmt} variant="outline" className="text-xs">
                                  .{fmt}
                                </Badge>
                              ))}
                              {formats.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{formats.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {profile.isDefault && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Star className="h-3 w-3 ml-1" />
                                ברירת מחדל
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(profile)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteProfile.mutate({ id: profile.id })}
                                disabled={deleteProfile.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות כלליות</CardTitle>
              <CardDescription>הגדרות בסיסיות של המערכת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="googleApiKey">Google API Key</Label>
                <p className="text-sm text-gray-600">מפתח API של Google לשליחת מיילים</p>
                <Input
                  id="googleApiKey"
                  type="password"
                  placeholder="הזן את ה-API Key שלך"
                  defaultValue=""
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">המפתח מאוחסן בצורה מאובטחת</p>
                <Button className="w-full">שמור מפתח</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות אבטחה</CardTitle>
              <CardDescription>ניהול הרשאות ואבטחה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>הגדרות אבטחה יתווספו בקרוב</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
