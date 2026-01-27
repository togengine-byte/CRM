import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { 
  Pencil, 
  Truck, 
  Save, 
  RefreshCw, 
  Users, 
  UserX, 
  UserPlus, 
  Key 
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { PERMISSION_LIST } from "./constants";
import { StaffFormData } from "./types";

export function StaffManagementSettings() {
  const { user } = useAuthContext();
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any>(null);
  
  const [formData, setFormData] = useState<StaffFormData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    role: "employee",
    permissions: {},
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
    onError: (error) => {
      // הודעות שגיאה ברורות למשתמש
      const errorMessage = error.message;
      if (errorMessage.includes("מייל") && errorMessage.includes("קיימת")) {
        toast.error("כתובת המייל כבר רשומה במערכת. אנא השתמש בכתובת מייל אחרת.", {
          duration: 5000,
        });
      } else if (errorMessage.includes("סיסמה")) {
        toast.error("הסיסמה חייבת להכיל לפחות 4 תווים", {
          duration: 4000,
        });
      } else {
        toast.error(errorMessage || "שגיאה בהוספת העובד. אנא נסה שוב.", {
          duration: 4000,
        });
      }
    },
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
      password: "",
      phone: staffUser.phone || "",
      companyName: staffUser.companyName || "",
      role: staffUser.role as "employee" | "courier",
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
