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
import type { QuantityFormData } from "@/types/products";

interface QuantityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isEditMode: boolean;
  formData: QuantityFormData;
  setFormData: (data: QuantityFormData) => void;
}

export function QuantityDialog({
  isOpen,
  onClose,
  onSubmit,
  isEditMode,
  formData,
  setFormData,
}: QuantityDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "עריכת כמות" : "כמות חדשה"}</DialogTitle>
          <DialogDescription>
            הגדר כמות ומחיר ספציפי לגודל זה
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>כמות *</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="לדוגמה: 100, 250, 500"
            />
          </div>
          <div>
            <Label>מחיר (₪) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="לדוגמה: 150.00"
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
