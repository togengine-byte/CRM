import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Truck, Save, RefreshCw } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export function SupplierWeightsSettings() {
  const { user } = useAuthContext();
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
  useEffect(() => {
    if (weights) {
      setLocalWeights(weights);
    }
  }, [weights]);

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
      </CardContent>
    </Card>
  );
}
