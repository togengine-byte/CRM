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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Save, ShoppingBag } from "lucide-react";
import { Loader2 } from "lucide-react";
import { PricelistFormData } from "./types";

export function PricelistSettings() {
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPricelist, setEditingPricelist] = useState<any>(null);
  const [formData, setFormData] = useState<PricelistFormData>({
    name: '',
    description: '',
    markupPercentage: 0,
    isDefault: false,
    displayOrder: 0,
  });

  const { data: pricelists, isLoading } = trpc.pricelists.list.useQuery();

  const createMutation = trpc.pricelists.create.useMutation({
    onSuccess: () => {
      toast.success('מחירון נוצר בהצלחה');
      utils.pricelists.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת מחירון: ${error.message}`);
    },
  });

  const updateMutation = trpc.pricelists.update.useMutation({
    onSuccess: () => {
      toast.success('מחירון עודכן בהצלחה');
      utils.pricelists.list.invalidate();
      setEditingPricelist(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון מחירון: ${error.message}`);
    },
  });

  const deleteMutation = trpc.pricelists.delete.useMutation({
    onSuccess: () => {
      toast.success('מחירון נמחק בהצלחה');
      utils.pricelists.list.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת מחירון: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      markupPercentage: 0,
      isDefault: false,
      displayOrder: 0,
    });
  };

  const handleEdit = (pricelist: any) => {
    setEditingPricelist(pricelist);
    setFormData({
      name: pricelist.name,
      description: pricelist.description || '',
      markupPercentage: parseFloat(pricelist.markupPercentage) || 0,
      isDefault: pricelist.isDefault || false,
      displayOrder: pricelist.displayOrder || 0,
    });
  };

  const handleSubmit = () => {
    if (editingPricelist) {
      updateMutation.mutate({
        id: editingPricelist.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('האם אתה בטוח שברצונך למחוק מחירון זה?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            מחירונים
          </CardTitle>
          <CardDescription>
            הגדר מחירונים עם אחוזי רווח שונים. המחירון קובע את אחוז הרווח שיתווסף למחיר הספק.
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingPricelist} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingPricelist(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              מחירון חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPricelist ? 'עריכת מחירון' : 'יצירת מחירון חדש'}
              </DialogTitle>
              <DialogDescription>
                הגדר שם ואחוז רווח למחירון
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">שם המחירון</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="לדוגמה: מחירון סטנדרטי"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור קצר של המחירון..."
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="markupPercentage">אחוז רווח (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="markupPercentage"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.markupPercentage}
                    onChange={(e) => setFormData({ ...formData, markupPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">
                    מחיר ספק 100₪ → מחיר ללקוח: ₪{(100 * (1 + formData.markupPercentage / 100)).toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">סדר תצוגה</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="isDefault">מחירון ברירת מחדל</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingPricelist(null);
                resetForm();
              }}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> שומר...</>
                ) : (
                  <><Save className="h-4 w-4 ml-2" /> {editingPricelist ? 'עדכן' : 'צור'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : !pricelists || pricelists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>אין מחירונים עדיין</p>
            <p className="text-sm">צור מחירון ראשון כדי להתחיל</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>תיאור</TableHead>
                <TableHead>אחוז רווח</TableHead>
                <TableHead>ברירת מחדל</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricelists.map((pricelist: any) => (
                <TableRow key={pricelist.id}>
                  <TableCell className="font-medium">{pricelist.name}</TableCell>
                  <TableCell className="text-gray-500">{pricelist.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {parseFloat(pricelist.markupPercentage || 0).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pricelist.isDefault && (
                      <Badge variant="default" className="bg-green-600">
                        <Star className="h-3 w-3 ml-1" />
                        ברירת מחדל
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(pricelist)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(pricelist.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">איך זה עובד?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• כל מחירון מגדיר אחוז רווח שיתווסף למחיר הספק</li>
            <li>• לדוגמה: מחיר ספק 100₪ + מחירון 30% = מחיר ללקוח 130₪</li>
            <li>• ניתן לשייך לקוח למחירון ספציפי בדף הלקוחות</li>
            <li>• בעריכת הצעה, ניתן תמיד לדרוס מחיר ידני</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
