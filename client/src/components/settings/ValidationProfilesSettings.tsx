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
import { FileCheck, Plus, Pencil, Trash2, Star, Palette, FileType, RefreshCw } from "lucide-react";
import { COLORSPACE_OPTIONS, FORMAT_OPTIONS } from "./constants";
import { ValidationProfileFormData } from "./types";

export function ValidationProfilesSettings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState<ValidationProfileFormData>({
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
                  {COLORSPACE_OPTIONS.map(cs => (
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
                  {FORMAT_OPTIONS.map(fmt => (
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
  );
}
