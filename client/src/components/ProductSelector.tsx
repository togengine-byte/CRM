import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Ruler,
  Hash,
  Plus,
  Sparkles,
  Calculator,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  imageUrl?: string;
}

interface ProductSize {
  id: number;
  name: string;
  basePrice: string;
  pricePerSqm?: string;
  pricingType: string;
}

interface ProductQuantity {
  id: number;
  quantity: number;
  priceMultiplier: string;
}

interface ProductAddon {
  id: number;
  name: string;
  price: string;
  priceType: string;
}

interface SelectedProduct {
  productId: number;
  productName: string;
  sizeId?: number;
  sizeName?: string;
  quantityId?: number;
  quantity?: number;
  customQuantity?: number;
  isCustomQuantity: boolean;
  selectedAddons: number[];
  calculatedPrice?: number;
  needsManualPricing: boolean;
  customWidth?: number;
  customHeight?: number;
}

interface ProductSelectorProps {
  onProductSelect: (product: SelectedProduct) => void;
  onCancel?: () => void;
}

export default function ProductSelector({ onProductSelect, onCancel }: ProductSelectorProps) {
  // State
  const [step, setStep] = useState<'category' | 'product' | 'options'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  const [customQuantity, setCustomQuantity] = useState<string>("");
  const [isCustomQuantity, setIsCustomQuantity] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [customWidth, setCustomWidth] = useState<string>("");
  const [customHeight, setCustomHeight] = useState<string>("");

  // Queries
  const { data: categories } = trpc.products.getCategories.useQuery();
  const { data: products } = trpc.products.list.useQuery(
    { categoryId: selectedCategoryId || undefined },
    { enabled: !!selectedCategoryId }
  );
  const { data: sizes } = trpc.products.getSizes.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );
  const { data: quantities } = trpc.products.getQuantities.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );
  const { data: addons } = trpc.products.getAddons.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  // Get selected items
  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const selectedSize = sizes?.find(s => s.id === selectedSizeId);
  const selectedQuantityOption = quantities?.find(q => q.id === selectedQuantityId);

  // Calculate price
  const calculatePrice = (): { price: number; needsManualPricing: boolean } => {
    if (!selectedSize) return { price: 0, needsManualPricing: false };

    // If custom quantity, needs manual pricing
    if (isCustomQuantity && customQuantity) {
      return { price: 0, needsManualPricing: true };
    }

    let basePrice = parseFloat(selectedSize.basePrice);
    
    // If pricing is per sqm and we have custom dimensions
    if (selectedSize.pricingType === 'per_sqm' && customWidth && customHeight) {
      const sqm = (parseFloat(customWidth) * parseFloat(customHeight)) / 10000; // cm to sqm
      basePrice = parseFloat(selectedSize.pricePerSqm || selectedSize.basePrice) * sqm;
    }

    // Apply quantity multiplier
    if (selectedQuantityOption) {
      basePrice *= parseFloat(selectedQuantityOption.priceMultiplier);
    }

    // Add addons
    const addonPrices = selectedAddons.reduce((sum, addonId) => {
      const addon = addons?.find(a => a.id === addonId);
      if (addon) {
        if (addon.priceType === 'fixed') {
          return sum + parseFloat(addon.price);
        } else if (addon.priceType === 'percentage') {
          return sum + (basePrice * parseFloat(addon.price) / 100);
        }
      }
      return sum;
    }, 0);

    return { price: basePrice + addonPrices, needsManualPricing: false };
  };

  const { price: calculatedPrice, needsManualPricing } = calculatePrice();

  // Handle category select
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddons([]);
    setStep('product');
  };

  // Handle product select
  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddons([]);
    setStep('options');
  };

  // Handle addon toggle
  const handleAddonToggle = (addonId: number) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  // Handle submit
  const handleSubmit = () => {
    if (!selectedProduct) return;

    const result: SelectedProduct = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sizeId: selectedSizeId || undefined,
      sizeName: selectedSize?.name,
      quantityId: selectedQuantityId || undefined,
      quantity: selectedQuantityOption?.quantity,
      customQuantity: isCustomQuantity ? parseInt(customQuantity) : undefined,
      isCustomQuantity,
      selectedAddons,
      calculatedPrice: needsManualPricing ? undefined : calculatedPrice,
      needsManualPricing,
      customWidth: customWidth ? parseFloat(customWidth) : undefined,
      customHeight: customHeight ? parseFloat(customHeight) : undefined,
    };

    onProductSelect(result);
  };

  // Get category icon
  const getCategoryIcon = (icon: string) => {
    const icons: Record<string, string> = {
      'print': '🖨️',
      'wide': '📐',
      'signs': '🪧',
      'silk': '👕',
      'sublimation': '🔥',
    };
    return icons[icon] || '📦';
  };

  // Render category selection
  const renderCategorySelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">בחר תחום</h3>
        <p className="text-sm text-slate-500">בחר את התחום המתאים לפרויקט שלך</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories?.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
          >
            <span className="text-3xl mb-2 block">{getCategoryIcon(category.icon)}</span>
            <span className="font-medium text-slate-700 group-hover:text-blue-600">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render product selection
  const renderProductSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('category')}
          className="text-slate-500"
        >
          <ChevronRight className="h-4 w-4 ml-1" />
          חזרה לתחומים
        </Button>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {getCategoryIcon(selectedCategory?.icon || '')} {selectedCategory?.name}
        </Badge>
      </div>

      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">בחר מוצר</h3>
        <p className="text-sm text-slate-500">בחר את המוצר הרצוי מתוך {selectedCategory?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products?.map((product) => (
          <button
            key={product.id}
            onClick={() => handleProductSelect(product.id)}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-right group"
          >
            <div className="flex items-start gap-3">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-slate-700 group-hover:text-blue-600">
                  {product.name}
                </h4>
                {product.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Render options selection
  const renderOptionsSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('product')}
          className="text-slate-500"
        >
          <ChevronRight className="h-4 w-4 ml-1" />
          חזרה למוצרים
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {getCategoryIcon(selectedCategory?.icon || '')} {selectedCategory?.name}
          </Badge>
          <ChevronLeft className="h-4 w-4 text-slate-400" />
          <Badge variant="outline" className="bg-slate-100">
            {selectedProduct?.name}
          </Badge>
        </div>
      </div>

      {/* Size Selection */}
      {sizes && sizes.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-700">
            <Ruler className="h-4 w-4" />
            גודל
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setSelectedSizeId(size.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedSizeId === size.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <span className="font-medium text-slate-700">{size.name}</span>
                <span className="block text-sm text-slate-500">
                  {size.pricingType === 'per_sqm' ? `₪${size.pricePerSqm}/מ"ר` : `₪${size.basePrice}`}
                </span>
              </button>
            ))}
          </div>

          {/* Custom dimensions for per_sqm pricing */}
          {selectedSize?.pricingType === 'per_sqm' && (
            <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm text-slate-600">רוחב (ס"מ)</Label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">גובה (ס"מ)</Label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  placeholder="200"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quantity Selection */}
      {quantities && quantities.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-700">
            <Hash className="h-4 w-4" />
            כמות
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {quantities.map((qty) => (
              <button
                key={qty.id}
                onClick={() => {
                  setSelectedQuantityId(qty.id);
                  setIsCustomQuantity(false);
                  setCustomQuantity("");
                }}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedQuantityId === qty.id && !isCustomQuantity
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <span className="font-medium text-slate-700">{qty.quantity} יח'</span>
              </button>
            ))}
            
            {/* Custom quantity option */}
            <button
              onClick={() => {
                setIsCustomQuantity(true);
                setSelectedQuantityId(null);
              }}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                isCustomQuantity
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-amber-300'
              }`}
            >
              <span className="font-medium text-amber-700">כמות אחרת</span>
              <span className="block text-xs text-amber-600">תמחור ידני</span>
            </button>
          </div>

          {/* Custom quantity input */}
          {isCustomQuantity && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">כמות מותאמת אישית - תמחור ידני</span>
              </div>
              <Input
                type="number"
                value={customQuantity}
                onChange={(e) => setCustomQuantity(e.target.value)}
                placeholder="הזן כמות"
                className="bg-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Addons Selection */}
      {addons && addons.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-700">
            <Sparkles className="h-4 w-4" />
            תוספות
          </Label>
          <div className="space-y-2">
            {addons.map((addon) => (
              <label
                key={addon.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAddons.includes(addon.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedAddons.includes(addon.id)}
                    onCheckedChange={() => handleAddonToggle(addon.id)}
                  />
                  <span className="font-medium text-slate-700">{addon.name}</span>
                </div>
                <span className="text-sm text-slate-500">
                  {addon.priceType === 'percentage' ? `+${addon.price}%` : `+₪${addon.price}`}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-700">סה"כ משוער:</span>
          </div>
          {needsManualPricing ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3 ml-1" />
              תמחור ידני
            </Badge>
          ) : (
            <span className="text-xl font-bold text-blue-600">
              ₪{calculatedPrice.toFixed(2)}
            </span>
          )}
        </div>
        {needsManualPricing && (
          <p className="text-sm text-amber-600 mt-2">
            בחרת כמות מותאמת אישית. ההצעה תועבר לתמחור ידני.
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            ביטול
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!selectedSizeId || (!selectedQuantityId && !isCustomQuantity)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Check className="h-4 w-4 ml-2" />
          הוסף להצעה
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          בחירת מוצר
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'category' && renderCategorySelection()}
        {step === 'product' && renderProductSelection()}
        {step === 'options' && renderOptionsSelection()}
      </CardContent>
    </Card>
  );
}
