import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  UserPlus,
  Key,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// ==================== DEVELOPER LOGS SETTINGS ====================
function DeveloperLogsSettings() {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.getLogs.useQuery();

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/admin/clear-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDelete: true }),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('כל הלוגים נמחקו בהצלחה');
        setShowConfirm(false);
        refetchLogs();
      } else {
        const data = await response.json();
        toast.error(data.error || 'שגיאה בניקוי הלוגים');
      }
    } catch (error) {
      toast.error('שגיאה בניקוי הלוגים');
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Developer Logs</CardTitle>
        <CardDescription>ניהול לוגים ופעולות במערכת</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">מידע</h3>
          <p className="text-sm text-blue-800">
            טבלת הלוגים שומרת את כל הפעולות והאירועים במערכת לצורכי דיבאגינג וניטור.
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">הלוגים האחרונים</h3>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען לוגים...</div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>זמן</TableHead>
                    <TableHead>קטגוריה</TableHead>
                    <TableHead>פעולה</TableHead>
                    <TableHead>הודעה</TableHead>
                    <TableHead>רמה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 20).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.createdAt).toLocaleString('he-IL')}
                      </TableCell>
                      <TableCell className="text-xs">{log.category}</TableCell>
                      <TableCell className="text-xs">{log.action}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{log.message}</TableCell>
                      <TableCell>
                        <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'default'}>
                          {log.level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground mb-6">אין לוגים</div>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">ניקוי לוגים</h3>
          <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="ml-2 h-4 w-4" />
                נקה את כל הלוגים
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>אישור מחיקה</DialogTitle>
                <DialogDescription>
                  האם אתה בטוח שברצונך למחוק את כל הלוגים? פעולה זו לא ניתנת לביטול.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isClearing}
                >
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearLogs}
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מוחק...
                    </>
                  ) : (
                    <>מחק את כל הלוגים</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== SUPPLIER WEIGHTS SETTINGS ====================
function SupplierWeightsSettings() {
  const { user } = useAuthContext();
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
  useEffect(() => {
    if (weights) {
      setLocalWeights(weights);
    }
  }, [weights]);

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
      </CardContent>
    </Card>
  );
}

// ==================== STAFF MANAGEMENT SETTINGS (EMPLOYEES & COURIERS) ====================
interface Permission {
  key: string;
  label: string;
  description: string;
}

const PERMISSION_LIST: Permission[] = [
  { key: 'canViewDashboard', label: 'צפייה בלוח בקרה', description: 'גישה לדף הבית ולוח הבקרה' },
  { key: 'canManageQuotes', label: 'ניהול הצעות מחיר', description: 'יצירה, עריכה ומחיקה של הצעות מחיר' },
  { key: 'canViewCustomers', label: 'צפייה בלקוחות', description: 'גישה לרשימת הלקוחות' },
  { key: 'canEditCustomers', label: 'עריכת לקוחות', description: 'עריכה ומחיקה של לקוחות' },
  { key: 'canViewSuppliers', label: 'צפייה בספקים', description: 'גישה לרשימת הספקים' },
  { key: 'canEditSuppliers', label: 'עריכת ספקים', description: 'עריכה ומחיקה של ספקים' },
  { key: 'canViewProducts', label: 'צפייה במוצרים', description: 'גישה לרשימת המוצרים' },
  { key: 'canEditProducts', label: 'עריכת מוצרים', description: 'עריכה ומחיקה של מוצרים' },
  { key: 'canViewAnalytics', label: 'צפייה באנליטיקס', description: 'גישה לדוחות וסטטיסטיקות' },
  { key: 'canManageSettings', label: 'ניהול הגדרות', description: 'גישה לדף ההגדרות' },
];

function StaffManagementSettings() {
  const { user } = useAuthContext();
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    role: "employee" as "employee" | "courier",
    permissions: {} as Record<string, boolean>,
  });

  // Query staff list
  const { data: staffList = [], isLoading } = trpc.staff.list.useQuery();

  // Filter to only employees and couriers
  const employees = staffList.filter((s: any) => s.role === 'employee' || s.role === 'admin');
  const couriers = staffList.filter((s: any) => s.role === 'courier');

  // Mutations
  const createStaffMutation = trpc.staff.create.useMutation({
    onSuccess: () => {
      toast.success("העובד נוסף בהצלחה");
      utils.staff.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const updateStaffMutation = trpc.staff.update.useMutation({
    onSuccess: () => {
      toast.success("פרטי העובד עודכנו");
      utils.staff.list.invalidate();
      setEditingUser(null);
      resetForm();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const updatePermissionsMutation = trpc.staff.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("ההרשאות עודכנו בהצלחה");
      utils.staff.list.invalidate();
      setIsPermissionsDialogOpen(false);
      setSelectedUserForPermissions(null);
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const deleteStaffMutation = trpc.staff.delete.useMutation({
    onSuccess: () => {
      toast.success("העובד הושבת");
      utils.staff.list.invalidate();
    },
    onError: (error) => toast.error("שגיאה: " + error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      companyName: "",
      role: "employee",
      permissions: {},
    });
  };

  const handleEdit = (staffUser: any) => {
    setEditingUser(staffUser);
    setFormData({
      name: staffUser.name || "",
      email: staffUser.email || "",
      phone: staffUser.phone || "",
      companyName: staffUser.companyName || "",
      role: staffUser.role,
      permissions: staffUser.permissions || {},
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenPermissions = (staffUser: any) => {
    setSelectedUserForPermissions(staffUser);
    setFormData(prev => ({
      ...prev,
      permissions: staffUser.permissions || {},
    }));
    setIsPermissionsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateStaffMutation.mutate({
        id: editingUser.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
      });
    } else {
      if (!formData.password || formData.password.length < 4) {
        toast.error("סיסמה חייבת להכיל לפחות 4 תווים");
        return;
      }
      createStaffMutation.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
        role: formData.role,
        permissions: formData.permissions,
      });
    }
  };

  const handleSavePermissions = () => {
    if (selectedUserForPermissions) {
      updatePermissionsMutation.mutate({
        userId: selectedUserForPermissions.id,
        permissions: formData.permissions,
      });
    }
  };

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין</Badge>;
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">מנהל</Badge>;
      case 'employee':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">עובד</Badge>;
      case 'courier':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">שליח</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">עובדים</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">שליחים</p>
                <p className="text-2xl font-bold">{couriers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>עובדים ושליחים</CardTitle>
            <CardDescription>ניהול עובדים, שליחים והרשאות</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingUser(null);
              resetForm();
            } else {
              setIsCreateDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 ml-2" />
                הוסף עובד
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingUser ? "עריכת עובד" : "הוספת עובד חדש"}</DialogTitle>
                <DialogDescription>
                  {editingUser ? "עדכן את פרטי העובד" : "הזן את פרטי העובד החדש"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ישראל ישראלי"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="israel@example.com"
                    dir="ltr"
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="לפחות 4 תווים"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>

                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="role">תפקיד *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">עובד</SelectItem>
                        <SelectItem value="courier">שליח</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!editingUser && formData.role === 'employee' && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">הרשאות</Label>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {PERMISSION_LIST.map(perm => (
                        <div key={perm.key} className="flex items-start gap-3">
                          <Checkbox
                            id={perm.key}
                            checked={formData.permissions[perm.key] || false}
                            onCheckedChange={() => togglePermission(perm.key)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={perm.key}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {perm.label}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingUser(null);
                  resetForm();
                }}>
                  ביטול
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.email || (!editingUser && !formData.password) || createStaffMutation.isPending || updateStaffMutation.isPending}
                >
                  {createStaffMutation.isPending || updateStaffMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 ml-2" />
                  )}
                  {editingUser ? "שמור שינויים" : "הוסף עובד"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="mr-2 text-gray-500">טוען...</span>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>אין עובדים במערכת</p>
              <p className="text-sm">לחץ על "הוסף עובד" להוספת עובד חדש</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">מייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">תפקיד</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((staffUser: any) => (
                  <TableRow key={staffUser.id}>
                    <TableCell className="font-medium">{staffUser.name || '-'}</TableCell>
                    <TableCell>{staffUser.email}</TableCell>
                    <TableCell dir="ltr">{staffUser.phone || '-'}</TableCell>
                    <TableCell>{getRoleBadge(staffUser.role)}</TableCell>
                    <TableCell>{getStatusBadge(staffUser.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(staffUser)}
                          title="עריכה"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {(staffUser.role === 'employee' || staffUser.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPermissions(staffUser)}
                            title="הרשאות"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        {staffUser.id !== user?.id && staffUser.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteStaffMutation.mutate({ id: staffUser.id })}
                            disabled={deleteStaffMutation.isPending}
                            title="השבת"
                          >
                            <UserX className="h-4 w-4" />
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

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPermissionsDialogOpen(false);
          setSelectedUserForPermissions(null);
        }
      }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>הרשאות - {selectedUserForPermissions?.name}</DialogTitle>
            <DialogDescription>
              הגדר את ההרשאות של העובד במערכת
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {PERMISSION_LIST.map(perm => (
              <div key={perm.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={`perm-${perm.key}`}
                  checked={formData.permissions[perm.key] || false}
                  onCheckedChange={() => togglePermission(perm.key)}
                />
                <div className="grid gap-1.5 leading-none flex-1">
                  <label
                    htmlFor={`perm-${perm.key}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {perm.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {perm.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPermissionsDialogOpen(false);
              setSelectedUserForPermissions(null);
            }}>
              ביטול
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמור הרשאות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== MAIN SETTINGS COMPONENT ====================
export default function Settings() {
  const { user } = useAuthContext();
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
          <p className="text-gray-600 mt-1">ניהול הגדרות המערכת, עובדים ופרופילי וולידציה</p>
        </div>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-[750px]">
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            עובדים
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
          <TabsTrigger value="developers" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            מפתחים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          {isAdmin ? (
            <StaffManagementSettings />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>רק מנהל מערכת יכול לגשת להגדרות עובדים</p>
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
                <DialogContent className="max-w-lg" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfile ? "עריכת פרופיל וולידציה" : "יצירת פרופיל וולידציה חדש"}
                    </DialogTitle>
                    <DialogDescription>
                      הגדר את הדרישות לבדיקת קבצי הדפסה
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="profileName">שם הפרופיל *</Label>
                      <Input
                        id="profileName"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="לדוגמה: הדפסה רגילה"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileDescription">תיאור</Label>
                      <Textarea
                        id="profileDescription"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="תיאור קצר של הפרופיל"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minDpi">DPI מינימלי *</Label>
                        <Input
                          id="minDpi"
                          type="number"
                          value={formData.minDpi}
                          onChange={(e) => setFormData(prev => ({ ...prev, minDpi: parseInt(e.target.value) || 300 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxDpi">DPI מקסימלי</Label>
                        <Input
                          id="maxDpi"
                          type="number"
                          value={formData.maxDpi || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxDpi: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="ללא הגבלה"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>מרחבי צבע מותרים *</Label>
                      <div className="flex flex-wrap gap-2">
                        {colorspaceOptions.map(cs => (
                          <Badge
                            key={cs}
                            variant={formData.allowedColorspaces.includes(cs) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleColorspace(cs)}
                          >
                            <Palette className="h-3 w-3 ml-1" />
                            {cs}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bleed">גלישה נדרשת (מ"מ) *</Label>
                      <Input
                        id="bleed"
                        type="number"
                        value={formData.requiredBleedMm}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiredBleedMm: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxSize">גודל קובץ מקסימלי (MB) *</Label>
                      <Input
                        id="maxSize"
                        type="number"
                        value={formData.maxFileSizeMb}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMb: parseInt(e.target.value) || 100 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>פורמטים מותרים *</Label>
                      <div className="flex flex-wrap gap-2">
                        {formatOptions.map(fmt => (
                          <Badge
                            key={fmt}
                            variant={formData.allowedFormats.includes(fmt) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFormat(fmt)}
                          >
                            <FileType className="h-3 w-3 ml-1" />
                            .{fmt}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="isDefault"
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                      />
                      <Label htmlFor="isDefault">הגדר כברירת מחדל</Label>
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
                    <Button 
                      onClick={handleSubmit}
                      disabled={!formData.name || formData.allowedColorspaces.length === 0 || formData.allowedFormats.length === 0}
                    >
                      {editingProfile ? "שמור שינויים" : "צור פרופיל"}
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

        <TabsContent value="developers">
          <DeveloperLogsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
