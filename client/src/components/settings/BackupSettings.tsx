import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Mail,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function BackupSettings() {
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Queries
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = trpc.backup.getSettings.useQuery();
  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = trpc.backup.list.useQuery();
  
  // Mutations
  const saveSettingsMutation = trpc.backup.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("הגדרות הגיבוי נשמרו");
      refetchSettings();
    },
    onError: (error) => {
      toast.error("שגיאה בשמירת ההגדרות: " + error.message);
    },
  });
  
  const createBackupMutation = trpc.backup.create.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("הגיבוי נוצר בהצלחה");
        refetchBackups();
        refetchSettings();
      } else {
        toast.error("שגיאה ביצירת הגיבוי: " + data.error);
      }
    },
    onError: (error) => {
      toast.error("שגיאה ביצירת הגיבוי: " + error.message);
    },
  });
  
  const deleteBackupMutation = trpc.backup.delete.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("הגיבוי נמחק");
        refetchBackups();
      } else {
        toast.error("שגיאה במחיקת הגיבוי");
      }
    },
    onError: (error) => {
      toast.error("שגיאה במחיקת הגיבוי: " + error.message);
    },
  });
  
  const sendEmailMutation = trpc.backup.sendEmailNow.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("הגיבוי נשלח למייל בהצלחה");
        refetchSettings();
      } else {
        toast.error("שגיאה בשליחת הגיבוי: " + data.error);
      }
    },
    onError: (error) => {
      toast.error("שגיאה בשליחת הגיבוי: " + error.message);
    },
  });
  
  const restoreMutation = trpc.backup.restore.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("הגיבוי תקין - " + (data.error || ""));
        setShowRestoreDialog(false);
        setRestoreFile(null);
      } else {
        toast.error("שגיאה בשחזור: " + data.error);
      }
      setIsRestoring(false);
    },
    onError: (error) => {
      toast.error("שגיאה בשחזור: " + error.message);
      setIsRestoring(false);
    },
  });
  
  // Download backup
  const { refetch: downloadBackup } = trpc.backup.download.useQuery(
    { filename: '' },
    { enabled: false }
  );
  
  const handleDownload = async (filename: string) => {
    try {
      const result = await trpc.backup.download.query({ filename });
      if (result.content) {
        const blob = new Blob([result.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("הגיבוי הורד בהצלחה");
      }
    } catch (error: any) {
      toast.error("שגיאה בהורדת הגיבוי: " + error.message);
    }
  };
  
  // Handle restore file upload
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
    }
  };
  
  const handleRestore = async () => {
    if (!restoreFile) return;
    
    setIsRestoring(true);
    try {
      const content = await restoreFile.text();
      await restoreMutation.mutateAsync({ backupData: content });
    } catch (error: any) {
      toast.error("שגיאה בקריאת הקובץ: " + error.message);
      setIsRestoring(false);
    }
  };
  
  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Backup Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            הגדרות גיבוי
          </CardTitle>
          <CardDescription>
            הגדרת גיבוי אוטומטי ושליחת גיבוי יומי למייל
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Backup Settings */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500" />
              <div>
                <p className="font-medium">גיבוי אוטומטי</p>
                <p className="text-sm text-slate-500">גיבוי כל שעתיים, שמירת 50 גיבויים אחרונים</p>
              </div>
            </div>
            <Switch
              checked={settings?.autoBackupEnabled ?? true}
              onCheckedChange={(checked) => {
                saveSettingsMutation.mutate({ autoBackupEnabled: checked });
              }}
            />
          </div>
          
          {/* Email Backup Settings */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="font-medium">גיבוי יומי למייל</p>
                  <p className="text-sm text-slate-500">שליחת קובץ גיבוי למייל בסוף כל יום</p>
                </div>
              </div>
              <Switch
                checked={settings?.emailBackupEnabled ?? false}
                onCheckedChange={(checked) => {
                  saveSettingsMutation.mutate({ emailBackupEnabled: checked });
                }}
              />
            </div>
            
            {settings?.emailBackupEnabled && (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="מייל המנהל"
                  value={settings?.adminEmail || ''}
                  onChange={(e) => {
                    saveSettingsMutation.mutate({ adminEmail: e.target.value });
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (settings?.adminEmail) {
                      sendEmailMutation.mutate({ email: settings.adminEmail });
                    } else {
                      toast.error("יש להזין מייל תחילה");
                    }
                  }}
                  disabled={sendEmailMutation.isPending || !settings?.adminEmail}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 ml-2" />
                      שלח עכשיו
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Last Backup Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">גיבוי אחרון</span>
              </div>
              <p className="text-sm text-green-600">
                {settings?.lastBackupTime 
                  ? formatDate(settings.lastBackupTime)
                  : 'לא בוצע עדיין'}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">מייל אחרון</span>
              </div>
              <p className="text-sm text-blue-600">
                {settings?.lastEmailBackupTime 
                  ? formatDate(settings.lastEmailBackupTime)
                  : 'לא נשלח עדיין'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Backups List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                גיבויים קיימים
              </CardTitle>
              <CardDescription>
                {backups?.length || 0} גיבויים שמורים (מקסימום 50)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(true)}
              >
                <Upload className="h-4 w-4 ml-2" />
                העלה גיבוי
              </Button>
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
              >
                {createBackupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                גיבוי עכשיו
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !backups || backups.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>אין גיבויים עדיין</p>
              <p className="text-sm">לחץ על "גיבוי עכשיו" ליצירת גיבוי ראשון</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך</TableHead>
                    <TableHead>גודל</TableHead>
                    <TableHead className="text-left">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup, index) => (
                    <TableRow key={backup.filename}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              אחרון
                            </Badge>
                          )}
                          {formatDate(backup.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>{formatSize(backup.size)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(backup.filename)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('האם למחוק את הגיבוי?')) {
                                deleteBackupMutation.mutate({ filename: backup.filename });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              שחזור מגיבוי
            </DialogTitle>
            <DialogDescription>
              העלה קובץ גיבוי לשחזור הנתונים
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700">שים לב!</p>
                  <p className="text-sm text-amber-600">
                    שחזור מגיבוי יחליף את כל הנתונים הקיימים. מומלץ לבצע גיבוי לפני השחזור.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label>בחר קובץ גיבוי</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleRestoreFileChange}
                className="mt-2"
              />
              {restoreFile && (
                <p className="text-sm text-slate-500 mt-2">
                  קובץ נבחר: {restoreFile.name} ({formatSize(restoreFile.size)})
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setRestoreFile(null);
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleRestore}
              disabled={!restoreFile || isRestoring}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  משחזר...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 ml-2" />
                  שחזר
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
