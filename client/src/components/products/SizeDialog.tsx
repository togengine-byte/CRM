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
import type { SizeFormData } from "@/types/products";

interface SizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isEditMode: boolean;
  formData: SizeFormData;
  setFormData: (data: SizeFormData) => void;
}

export function SizeDialog({
  isOpen,
  onClose,
  onSubmit,
  isEditMode,
  formData,
  setFormData,
}: SizeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "עריכת גודל" : "גודל חדש"}</DialogTitle>
          <DialogDescription>
            הגדר את שם הגודל והמידות
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>שם הגודל *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: A4, סטנדרט 9x5"
            />
          </div>
          <div>
            <Label>מידות (אופציונלי)</Label>
            <Input
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              placeholder="לדוגמה: 21x29.7 ס״מ"
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
