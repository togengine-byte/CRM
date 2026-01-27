import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Trash2, Loader2, Lock, FileText, Briefcase, Users, Truck, Package, Tag, ScrollText, AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

const CATEGORY_INFO = {
  quotes: { label: "הצעות מחיר", icon: FileText, color: "bg-blue-100 text-blue-700", description: "כולל פריטים, קבצים מצורפים ועבודות ספקים" },
  jobs: { label: "עבודות ספקים", icon: Briefcase, color: "bg-purple-100 text-purple-700", description: "כל העבודות בייצור" },
  customers: { label: "לקוחות", icon: Users, color: "bg-green-100 text-green-700", description: "כל הלקוחות ומחירונים משויכים" },
  suppliers: { label: "ספקים", icon: Truck, color: "bg-orange-100 text-orange-700", description: "כל הספקים" },
  products: { label: "מוצרים", icon: Package, color: "bg-pink-100 text-pink-700", description: "כולל גדלים, כמויות ותוספות" },
  pricelists: { label: "מחירונים", icon: Tag, color: "bg-yellow-100 text-yellow-700", description: "כולל פריטי מחירון" },
  logs: { label: "לוגים", icon: ScrollText, color: "bg-gray-100 text-gray-700", description: "לוגי מערכת" },
  all: { label: "הכל", icon: AlertTriangle, color: "bg-red-100 text-red-700", description: "מחיקת כל הנתונים (חוץ ממנהלים)" },
};

type CategoryKey = keyof typeof CATEGORY_INFO;

export function DeveloperLogsSettings() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  
  const [accessCode, setAccessCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<CategoryKey | null>(null);
  const [confirmText, setConfirmText] = useState("");
  
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.getLogs.useQuery(undefined, {
    enabled: isVerified,
  });
  
  const { data: dataCounts, refetch: refetchCounts } = trpc.admin.getDataCounts.useQuery(
    { code: accessCode },
    { enabled: isVerified }
  );
  
  const verifyCodeMutation = trpc.admin.verifyDeveloperCode.useMutation();
  const deleteDataMutation = trpc.admin.deleteDataByCategory.useMutation();

  const handleVerifyCode = async () => {
    if (!accessCode) {
      toast.error("יש להזין קוד גישה");
      return;
    }
    
    setIsVerifying(true);
    try {
      const result = await verifyCodeMutation.mutateAsync({ code: accessCode });
      if (result.valid) {
        setIsVerified(true);
        toast.success("קוד גישה אומת בהצלחה");
      } else {
        toast.error("קוד גישה שגוי");
      }
    } catch (error) {
      toast.error("שגיאה באימות הקוד");
    } finally {
      setIsVerifying(false);
    }
  };

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
        refetchCounts();
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

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    
    const categoryLabel = CATEGORY_INFO[deleteCategory].label;
    if (confirmText !== categoryLabel) {
      toast.error(`יש להקליד "${categoryLabel}" לאישור`);
      return;
    }
    
    setIsClearing(true);
    try {
      const result = await deleteDataMutation.mutateAsync({
        code: accessCode,
        category: deleteCategory,
      });
      
      if (result.success) {
        const message = result.deletedCount === -1 
          ? "כל הנתונים נמחקו בהצלחה"
          : `נמחקו ${result.deletedCount} רשומות`;
        toast.success(message);
        setDeleteCategory(null);
        setConfirmText("");
        refetchCounts();
        if (deleteCategory === 'logs' || deleteCategory === 'all') {
          refetchLogs();
        }
      }
    } catch (error: any) {
      toast.error(error.message || "שגיאה במחיקת הנתונים");
    } finally {
      setIsClearing(false);
    }
  };

  // Not admin - show access denied
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">גישה מוגבלת</h3>
          <p className="text-gray-500">רק מנהל מערכת יכול לגשת לאזור המפתחים</p>
        </CardContent>
      </Card>
    );
  }

  // Admin but not verified - show code input
  if (!isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            אזור מפתחים
          </CardTitle>
          <CardDescription>יש להזין קוד גישה למפתחים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              אזור זה מכיל כלים רגישים למחיקת נתונים. יש להזין את קוד הגישה למפתחים כדי להמשיך.
            </p>
          </div>
          
          <div className="flex gap-2 max-w-md">
            <Input
              type="password"
              placeholder="הזן קוד גישה למפתחים"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
            />
            <Button onClick={handleVerifyCode} disabled={isVerifying}>
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "אמת"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verified - show full developer panel
  return (
    <div className="space-y-6">
      {/* Data Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            ניהול נתונים
          </CardTitle>
          <CardDescription>מחיקת נתונים לפי קטגוריה - פעולה זו לא ניתנת לביטול!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ אזהרה: מחיקת נתונים היא פעולה בלתי הפיכה. ודא שיש לך גיבוי לפני המחיקה.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(CATEGORY_INFO) as CategoryKey[]).map((key) => {
              const info = CATEGORY_INFO[key];
              const Icon = info.icon;
              const count = dataCounts?.[key as keyof typeof dataCounts] ?? 0;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border ${info.color} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setDeleteCategory(key)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{info.label}</span>
                  </div>
                  {key !== 'all' && (
                    <div className="text-2xl font-bold">{count}</div>
                  )}
                  <p className="text-xs mt-1 opacity-75">{info.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteCategory !== null} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              אישור מחיקה
            </DialogTitle>
            <DialogDescription>
              {deleteCategory && (
                <>
                  <p className="mb-4">
                    אתה עומד למחוק את כל ה{CATEGORY_INFO[deleteCategory].label}.
                    {deleteCategory !== 'all' && dataCounts && (
                      <strong> ({dataCounts[deleteCategory as keyof typeof dataCounts]} רשומות)</strong>
                    )}
                  </p>
                  <p className="mb-4 text-sm">{CATEGORY_INFO[deleteCategory].description}</p>
                  <p className="font-medium text-red-600">
                    פעולה זו לא ניתנת לביטול!
                  </p>
                  <p className="mt-4 text-sm">
                    להמשך, הקלד: <strong>{CATEGORY_INFO[deleteCategory].label}</strong>
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder={deleteCategory ? CATEGORY_INFO[deleteCategory].label : ""}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2"
          />
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteCategory(null);
                setConfirmText("");
              }}
              disabled={isClearing}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={isClearing || (deleteCategory ? confirmText !== CATEGORY_INFO[deleteCategory].label : true)}
            >
              {isClearing ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  מוחק...
                </>
              ) : (
                <>מחק</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Card */}
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
    </div>
  );
}
