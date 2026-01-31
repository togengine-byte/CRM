import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  FolderOpen, 
  Settings2, 
  FileCheck, 
  Palette, 
  FileType, 
  Scissors, 
  Target, 
  Type, 
  Maximize2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

// Constants
const COLORSPACE_OPTIONS = ["CMYK", "RGB", "Grayscale", "LAB"];
const FORMAT_OPTIONS = ["pdf", "ai", "eps", "tiff", "jpg", "jpeg", "png"];

interface CategoryValidationData {
  validationEnabled: boolean;
  minDpi: number;
  maxDpi?: number;
  allowedColorspaces: string[];
  requiredBleedMm: number;
  requireBleed: boolean;
  requireCropMarks: boolean;
  requireRegistrationMarks: boolean;
  requireColorBars: boolean;
  requireEmbeddedFonts: boolean;
  allowOutlinedFonts: boolean;
  maxFileSizeMb: number;
  allowedFormats: string[];
  aspectRatioTolerance: number;
}

const DEFAULT_VALIDATION: CategoryValidationData = {
  validationEnabled: true,
  minDpi: 300,
  maxDpi: undefined,
  allowedColorspaces: ["CMYK"],
  requiredBleedMm: 3,
  requireBleed: true,
  requireCropMarks: false,
  requireRegistrationMarks: false,
  requireColorBars: false,
  requireEmbeddedFonts: true,
  allowOutlinedFonts: true,
  maxFileSizeMb: 100,
  allowedFormats: ["pdf", "ai", "eps", "tiff", "jpg", "png"],
  aspectRatioTolerance: 5,
};

export function CategoryValidationSettings() {
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState<CategoryValidationData>(DEFAULT_VALIDATION);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const utils = trpc.useUtils();
  
  const { data: categories, isLoading, refetch } = trpc.products.getCategories.useQuery();

  // Parse JSON arrays safely
  const parseArraySafe = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      validationEnabled: category.validationEnabled ?? true,
      minDpi: category.minDpi ?? 300,
      maxDpi: category.maxDpi || undefined,
      allowedColorspaces: parseArraySafe(category.allowedColorspaces) || ["CMYK"],
      requiredBleedMm: parseFloat(category.requiredBleedMm) || 3,
      requireBleed: category.requireBleed ?? true,
      requireCropMarks: category.requireCropMarks ?? false,
      requireRegistrationMarks: category.requireRegistrationMarks ?? false,
      requireColorBars: category.requireColorBars ?? false,
      requireEmbeddedFonts: category.requireEmbeddedFonts ?? true,
      allowOutlinedFonts: category.allowOutlinedFonts ?? true,
      maxFileSizeMb: category.maxFileSizeMb ?? 100,
      allowedFormats: parseArraySafe(category.allowedFormats) || ["pdf", "ai", "eps", "tiff", "jpg", "png"],
      aspectRatioTolerance: parseFloat(category.aspectRatioTolerance) || 5,
    });
  };

  const updateCategory = trpc.categories.updateValidation.useMutation({
    onSuccess: () => {
      toast.success("הגדרות הוולידציה עודכנו בהצלחה");
      utils.products.getCategories.invalidate();
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error("שגיאה בעדכון: " + error.message);
    },
  });

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("קטגוריה נוצרה בהצלחה");
      utils.products.getCategories.invalidate();
      setIsCreateDialogOpen(false);
      setNewCategoryName("");
    },
    onError: (error) => {
      toast.error("שגיאה ביצירה: " + error.message);
    },
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("קטגוריה נמחקה בהצלחה");
      utils.products.getCategories.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה במחיקה: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!editingCategory) return;
    
    updateCategory.mutate({
      id: editingCategory.id,
      ...formData,
    });
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            הגדרות וולידציה לקטגוריות
          </CardTitle>
          <CardDescription>
            הגדר כללי בדיקת קבצים לכל קטגוריית מוצרים (DPI, צבע, בליד, פאסרים)
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            רענן
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            קטגוריה חדשה
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>אין קטגוריות. צור קטגוריה חדשה להתחיל.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {categories.map((category: any) => (
              <AccordionItem key={category.id} value={`cat-${category.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <FolderOpen className="h-5 w-5 text-indigo-500" />
                    <span className="font-medium">{category.name}</span>
                    <div className="flex gap-2 mr-auto">
                      {category.validationEnabled !== false ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <FileCheck className="h-3 w-3 ml-1" />
                          וולידציה פעילה
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500">
                          וולידציה כבויה
                        </Badge>
                      )}
                      {category.minDpi && (
                        <Badge variant="secondary">
                          {category.minDpi} DPI
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                    {/* Current Settings Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-background rounded border">
                        <p className="text-muted-foreground text-xs">DPI מינימלי</p>
                        <p className="font-bold text-lg">{category.minDpi || 300}</p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-muted-foreground text-xs">בליד נדרש</p>
                        <p className="font-bold text-lg">
                          {category.requireBleed !== false ? `${category.requiredBleedMm || 3}mm` : 'לא נדרש'}
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-muted-foreground text-xs">מרחב צבע</p>
                        <p className="font-bold">
                          {parseArraySafe(category.allowedColorspaces).join(', ') || 'CMYK'}
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <p className="text-muted-foreground text-xs">סטיית פרופורציה</p>
                        <p className="font-bold text-lg">{category.aspectRatioTolerance || 5}%</p>
                      </div>
                    </div>

                    {/* Marks Requirements */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={category.requireCropMarks ? "default" : "outline"}>
                        <Scissors className="h-3 w-3 ml-1" />
                        סימני חיתוך {category.requireCropMarks ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={category.requireRegistrationMarks ? "default" : "outline"}>
                        <Target className="h-3 w-3 ml-1" />
                        סימני רישום {category.requireRegistrationMarks ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={category.requireColorBars ? "default" : "outline"}>
                        <Palette className="h-3 w-3 ml-1" />
                        פסי צבע {category.requireColorBars ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={category.requireEmbeddedFonts !== false ? "default" : "outline"}>
                        <Type className="h-3 w-3 ml-1" />
                        פונטים מוטמעים {category.requireEmbeddedFonts !== false ? '✓' : '✗'}
                      </Badge>
                    </div>

                    {/* Allowed Formats */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">פורמטים מותרים:</p>
                      <div className="flex flex-wrap gap-1">
                        {parseArraySafe(category.allowedFormats).map((fmt: string) => (
                          <Badge key={fmt} variant="secondary" className="text-xs">
                            .{fmt}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleEdit(category)}>
                        <Pencil className="h-4 w-4 ml-1" />
                        ערוך הגדרות
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`האם למחוק את הקטגוריה "${category.name}"?`)) {
                            deleteCategory.mutate({ id: category.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        מחק
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-indigo-600" />
              הגדרות וולידציה - {editingCategory?.name}
            </DialogTitle>
            <DialogDescription>
              הגדר את כללי בדיקת הקבצים לקטגוריה זו. המוצרים בקטגוריה יירשו הגדרות אלו.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base font-medium">הפעל וולידציה</Label>
                <p className="text-sm text-muted-foreground">בדוק קבצים שמועלים למוצרים בקטגוריה זו</p>
              </div>
              <Switch
                checked={formData.validationEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, validationEnabled: checked }))}
              />
            </div>

            {formData.validationEnabled && (
              <>
                <Separator />

                {/* DPI Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    הגדרות רזולוציה (DPI)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>DPI מינימלי *</Label>
                      <Input
                        type="number"
                        value={formData.minDpi}
                        onChange={(e) => setFormData(prev => ({ ...prev, minDpi: parseInt(e.target.value) || 300 }))}
                      />
                      <p className="text-xs text-muted-foreground">הרזולוציה המינימלית הנדרשת להדפסה</p>
                    </div>
                    <div className="space-y-2">
                      <Label>DPI מקסימלי</Label>
                      <Input
                        type="number"
                        value={formData.maxDpi || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDpi: e.target.value ? parseInt(e.target.value) : undefined }))}
                        placeholder="ללא הגבלה"
                      />
                      <p className="text-xs text-muted-foreground">אזהרה אם גבוה מדי (אופציונלי)</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Colorspace */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    מרחבי צבע מותרים
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {COLORSPACE_OPTIONS.map(cs => (
                      <Badge
                        key={cs}
                        variant={formData.allowedColorspaces.includes(cs) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1 px-3"
                        onClick={() => toggleColorspace(cs)}
                      >
                        {cs}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Bleed Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Scissors className="h-4 w-4" />
                    הגדרות בליד (שפה)
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.requireBleed}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireBleed: checked }))}
                      />
                      <Label>דרוש בליד</Label>
                    </div>
                    {formData.requireBleed && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          className="w-24"
                          value={formData.requiredBleedMm}
                          onChange={(e) => setFormData(prev => ({ ...prev, requiredBleedMm: parseFloat(e.target.value) || 3 }))}
                        />
                        <span className="text-sm text-muted-foreground">מ"מ</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Marks Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    סימנים ופאסרים
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Switch
                        checked={formData.requireCropMarks}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireCropMarks: checked }))}
                      />
                      <div>
                        <Label className="text-sm">סימני חיתוך</Label>
                        <p className="text-xs text-muted-foreground">Crop Marks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Switch
                        checked={formData.requireRegistrationMarks}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireRegistrationMarks: checked }))}
                      />
                      <div>
                        <Label className="text-sm">סימני רישום</Label>
                        <p className="text-xs text-muted-foreground">Registration Marks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Switch
                        checked={formData.requireColorBars}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireColorBars: checked }))}
                      />
                      <div>
                        <Label className="text-sm">פסי צבע</Label>
                        <p className="text-xs text-muted-foreground">Color Bars</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Font Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    הגדרות פונטים
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Switch
                        checked={formData.requireEmbeddedFonts}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireEmbeddedFonts: checked }))}
                      />
                      <div>
                        <Label className="text-sm">דרוש פונטים מוטמעים</Label>
                        <p className="text-xs text-muted-foreground">Embedded Fonts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded">
                      <Switch
                        checked={formData.allowOutlinedFonts}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowOutlinedFonts: checked }))}
                      />
                      <div>
                        <Label className="text-sm">אפשר פונטים כקווים</Label>
                        <p className="text-xs text-muted-foreground">Outlined Fonts</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Aspect Ratio */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Maximize2 className="h-4 w-4" />
                    סטיית פרופורציה מותרת
                  </h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      className="w-24"
                      value={formData.aspectRatioTolerance}
                      onChange={(e) => setFormData(prev => ({ ...prev, aspectRatioTolerance: parseFloat(e.target.value) || 5 }))}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    סטייה מותרת ביחס בין רוחב לגובה הקובץ לעומת מידות ההדפסה
                  </p>
                </div>

                <Separator />

                {/* File Size */}
                <div className="space-y-4">
                  <h4 className="font-medium">גודל קובץ מקסימלי</h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24"
                      value={formData.maxFileSizeMb}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMb: parseInt(e.target.value) || 100 }))}
                    />
                    <span className="text-sm text-muted-foreground">MB</span>
                  </div>
                </div>

                <Separator />

                {/* Allowed Formats */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    פורמטים מותרים
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {FORMAT_OPTIONS.map(fmt => (
                      <Badge
                        key={fmt}
                        variant={formData.allowedFormats.includes(fmt) ? "default" : "outline"}
                        className="cursor-pointer text-sm py-1 px-3"
                        onClick={() => toggleFormat(fmt)}
                      >
                        .{fmt}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={updateCategory.isPending}>
              {updateCategory.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת קטגוריה חדשה</DialogTitle>
            <DialogDescription>
              צור קטגוריה חדשה עם הגדרות וולידציה ברירת מחדל
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם הקטגוריה *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="לדוגמה: בית דפוס"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={() => createCategory.mutate({ name: newCategoryName })}
              disabled={!newCategoryName || createCategory.isPending}
            >
              {createCategory.isPending ? "יוצר..." : "צור קטגוריה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
