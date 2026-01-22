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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  FileCheck, 
  Plus, 
  Pencil, 
  Trash2,
  Star,
  Shield,
  Palette,
  FileType,
  Maximize,
  HardDrive,
  Truck,
  Save,
  RefreshCw,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/_core/hooks/useAuth";

// Supplier Weights Settings Component
function SupplierWeightsSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: weights, isLoading } = trpc.settings.supplierWeights.get.useQuery();
  
  const [localWeights, setLocalWeights] = useState({
    price: 40,
    rating: 30,
    deliveryTime: 20,
    reliability: 10,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when data loads
  useState(() => {
    if (weights) {
      setLocalWeights(weights);
    }
  });

  // Sync with server data
  if (weights && !hasChanges) {
    if (localWeights.price !== weights.price ||
        localWeights.rating !== weights.rating ||
        localWeights.deliveryTime !== weights.deliveryTime ||
        localWeights.reliability !== weights.reliability) {
      setLocalWeights(weights);
    }
  }

  const updateWeights = trpc.settings.supplierWeights.update.useMutation({
    onSuccess: () => {
      toast.success("משקלי המלצות ספקים עודכנו בהצלחה");
      utils.settings.supplierWeights.get.invalidate();
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("שגיאה: " + error.message);
    },
  });

  const handleWeightChange = (key: keyof typeof localWeights, value: number) => {
    setLocalWeights(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const totalWeight = localWeights.price + localWeights.rating + localWeights.deliveryTime + localWeights.reliability;
  const isValid = totalWeight === 100;

  const handleSave = () => {
    if (!isValid) {
      toast.error(`סכום המשקלים חייב להיות 100% (כרגע: ${totalWeight}%)`);
      return;
    }
    updateWeights.mutate(localWeights);
  };

  const handleReset = () => {
    if (weights) {
      setLocalWeights(weights);
      setHasChanges(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const weightItems = [
    { key: 'price' as const, label: 'מחיר', description: 'ספק זול יותר מקבל ציון גבוה יותר', color: 'bg-green-500' },
    { key: 'rating' as const, label: 'דירוג', description: 'ממוצע דירוגים מעסקאות קודמות', color: 'bg-yellow-500' },
    { key: 'deliveryTime' as const, label: 'זמן אספקה', description: 'ספק מהיר יותר מקבל ציון גבוה', color: 'bg-blue-500' },
    { key: 'reliability' as const, label: 'אמינות', description: 'אחוז עבודות שנמסרו בזמן', color: 'bg-purple-500' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-500">טוען...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          משקלי המלצות ספקים
        </CardTitle>
        <CardDescription>
          הגדר את המשקל של כל קריטריון בחישוב המלצות ספקים. סה"כ המשקלים חייב להיות 100%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total indicator */}
        <div className={`p-4 rounded-lg border-2 ${
          isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">סה"כ משקלים:</span>
            <span className={`text-2xl font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalWeight}%
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600 mt-1">
              {totalWeight > 100 ? `עודף ${totalWeight - 100}%` : `חסר ${100 - totalWeight}%`}
            </p>
          )}
        </div>

        {/* Weight sliders */}
        <div className="space-y-6">
          {weightItems.map(item => (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">{item.label}</Label>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={localWeights[item.key]}
                    onChange={(e) => handleWeightChange(item.key, parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    min={0}
                    max={100}
                    disabled={!isAdmin}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[localWeights[item.key]]}
                  onValueChange={([value]) => handleWeightChange(item.key, value)}
                  max={100}
                  step={5}
                  className="flex-1"
                  disabled={!isAdmin}
                />
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Visual breakdown */}
        <div className="space-y-2">
          <Label>חלוקה ויזואלית</Label>
          <div className="h-8 rounded-lg overflow-hidden flex">
            {weightItems.map(item => (
              <div
                key={item.key}
                className={`${item.color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                style={{ width: `${localWeights[item.key]}%` }}
              >
                {localWeights[item.key] >= 10 && `${localWeights[item.key]}%`}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {weightItems.map(item => (
              <div key={item.key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateWeights.isPending}
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              ביטול שינויים
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !isValid || updateWeights.isPending}
            >
              {updateWeights.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </div>
        )}

        {!isAdmin && (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>רק מנהל מערכת יכול לשנות הגדרות אלו</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minDpi: 300,
    maxDpi: undefined as number | undefined,
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

  const handleEdit = (profile: any) => {
    setEditingProfile(profile);
    // Parse arrays safely - check if already an array or string
    const parseArray = (value: any) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      return [];
    };
    
    setFormData({
      name: profile.name,
      description: profile.description || "",
      minDpi: profile.minDpi,
      maxDpi: profile.maxDpi || undefined,
      allowedColorspaces: parseArray(profile.allowedColorspaces) || ["CMYK"],
      requiredBleedMm: profile.requiredBleedMm,
      maxFileSizeMb: profile.maxFileSizeMb,
      allowedFormats: parseArray(profile.allowedFormats) || ["pdf"],
      isDefault: profile.isDefault || false,
    });
  };

  const handleSubmit = () => {
    if (editingProfile) {
      updateProfile.mutate({ id: editingProfile.id, ...formData });
    } else {
      createProfile.mutate(formData);
    }
  };

  const colorspaceOptions = ["CMYK", "RGB", "Grayscale", "LAB"];
  const formatOptions = ["pdf", "ai", "eps", "tiff", "psd", "jpg", "png"];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-600 mt-1">ניהול הגדרות המערכת ופרופילי וולידציה</p>
        </div>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            ספקים
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            וולידציה
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            אבטחה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <SupplierWeightsSettings />
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfile ? "עריכת פרופיל וולידציה" : "יצירת פרופיל וולידציה חדש"}
                    </DialogTitle>
                    <DialogDescription>
                      הגדר את דרישות הקובץ לבדיקה אוטומטית
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">שם הפרופיל</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="לדוגמה: הדפסה סטנדרטית"
                        />
                      </div>
                      <div className="space-y-2 flex items-end gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="isDefault"
                            checked={formData.isDefault}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                          />
                          <Label htmlFor="isDefault" className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            פרופיל ברירת מחדל
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">תיאור</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="תיאור קצר של הפרופיל..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minDpi" className="flex items-center gap-1">
                          <Maximize className="h-4 w-4" />
                          רזולוציה מינימלית (DPI)
                        </Label>
                        <Input
                          id="minDpi"
                          type="number"
                          value={formData.minDpi}
                          onChange={(e) => setFormData(prev => ({ ...prev, minDpi: parseInt(e.target.value) || 300 }))}
                          min={72}
                          max={1200}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxDpi">רזולוציה מקסימלית (DPI)</Label>
                        <Input
                          id="maxDpi"
                          type="number"
                          value={formData.maxDpi || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxDpi: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="ללא הגבלה"
                          min={72}
                          max={2400}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bleed">גלישה נדרשת (מ"מ)</Label>
                        <Input
                          id="bleed"
                          type="number"
                          value={formData.requiredBleedMm}
                          onChange={(e) => setFormData(prev => ({ ...prev, requiredBleedMm: parseInt(e.target.value) || 0 }))}
                          min={0}
                          max={20}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxSize" className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          גודל קובץ מקסימלי (MB)
                        </Label>
                        <Input
                          id="maxSize"
                          type="number"
                          value={formData.maxFileSizeMb}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMb: parseInt(e.target.value) || 100 }))}
                          min={1}
                          max={500}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Palette className="h-4 w-4" />
                        מרחבי צבע מותרים
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {colorspaceOptions.map((cs) => (
                          <Badge
                            key={cs}
                            variant={formData.allowedColorspaces.includes(cs) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleColorspace(cs)}
                          >
                            {cs}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <FileType className="h-4 w-4" />
                        פורמטים מותרים
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {formatOptions.map((fmt) => (
                          <Badge
                            key={fmt}
                            variant={formData.allowedFormats.includes(fmt) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFormat(fmt)}
                          >
                            .{fmt}
                          </Badge>
                        ))}
                      </div>
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
                      disabled={!formData.name || createProfile.isPending || updateProfile.isPending}
                    >
                      {editingProfile ? "עדכן" : "צור"} פרופיל
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">טוען...</div>
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
                      <TableHead>שם</TableHead>
                      <TableHead>DPI</TableHead>
                      <TableHead>מרחב צבע</TableHead>
                      <TableHead>גלישה</TableHead>
                      <TableHead>פורמטים</TableHead>
                      <TableHead>גודל מקס'</TableHead>
                      <TableHead className="text-left">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => {
                      const colorspaces = JSON.parse(profile.allowedColorspaces as string || '[]');
                      const formats = JSON.parse(profile.allowedFormats as string || '[]');
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {profile.isDefault && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                              <span className="font-medium">{profile.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {profile.minDpi}
                            {profile.maxDpi && ` - ${profile.maxDpi}`}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {colorspaces.slice(0, 2).map((cs: string) => (
                                <Badge key={cs} variant="secondary" className="text-xs">{cs}</Badge>
                              ))}
                              {colorspaces.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{colorspaces.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{profile.requiredBleedMm}מ"מ</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formats.slice(0, 3).map((fmt: string) => (
                                <Badge key={fmt} variant="outline" className="text-xs">.{fmt}</Badge>
                              ))}
                              {formats.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{formats.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{profile.maxFileSizeMb}MB</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("האם למחוק את הפרופיל?")) {
                                    deleteProfile.mutate({ id: profile.id });
                                  }
                                }}
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
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות כלליות</CardTitle>
              <CardDescription>הגדרות בסיסיות של המערכת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="googleApiKey">Google API Key</Label>
                <p className="text-sm text-gray-600">מפתח API של Google לשליחת מיילים</p>
                <Input
                  id="googleApiKey"
                  type="password"
                  placeholder="הזן את ה-API Key שלך"
                  defaultValue=""
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">המפתח מאוחסן בצורה מאובטחת</p>
                <Button className="w-full">שמור מפתח</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות אבטחה</CardTitle>
              <CardDescription>ניהול הרשאות ואבטחה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>הגדרות אבטחה יתווספו בקרוב</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
