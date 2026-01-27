import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AddonFormData } from "@/types/products";

interface AddonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isEditMode: boolean;
  formData: AddonFormData;
  setFormData: (data: AddonFormData) => void;
}

export function AddonDialog({
  isOpen,
  onClose,
  onSubmit,
  isEditMode,
  formData,
  setFormData,
}: AddonDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "עריכת תוספת" : "תוספת חדשה"}</DialogTitle>
          <DialogDescription>
            הגדר תוספת למוצר (למינציה, הבלטה וכו')
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>שם התוספת *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: למינציה מט"
            />
          </div>
          <div>
            <Label>סוג תמחור</Label>
            <Select
              value={formData.priceType}
              onValueChange={(value: "fixed" | "percentage" | "per_unit") => 
                setFormData({ ...formData, priceType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                <SelectItem value="percentage">אחוז מהמחיר (%)</SelectItem>
                <SelectItem value="per_unit">מחיר ליחידה (₪)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {formData.priceType === "percentage" ? "אחוז" : "מחיר (₪)"} *
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder={formData.priceType === "percentage" ? "לדוגמה: 50" : "לדוגמה: 40.00"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={onSubmit}>
            {isEditMode ? "עדכן" : "צור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
