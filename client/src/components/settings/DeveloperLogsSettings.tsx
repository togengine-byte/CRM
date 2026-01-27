import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

export function DeveloperLogsSettings() {
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
