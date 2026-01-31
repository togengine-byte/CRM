/**
 * ProductSelectionRow Component
 * Handles product selection with file upload in the same row
 * Includes animation and sound effects on successful upload
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Package, Upload, ChevronDown, Plus, Palette, Loader2, 
  Check, AlertCircle, AlertTriangle, X
} from "lucide-react";
import { toast } from "sonner";
import {
  type Category,
  type SelectedProduct,
  type SelectedAddon,
  getImageDimensions,
  validateFileForProduct,
  uploadFileToS3,
  validateFileBasic,
  ALLOWED_EXTENSIONS,
} from "./index";

// Success sound for animations
const playSuccessSound = () => {
  const audio = new Audio('/success-sound.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

interface ProductSelectionRowProps {
  categories: Array<{ id: number; name: string }> | undefined;
  products: Array<{ id: number; name: string }> | undefined;
  sizes: Array<{ id: number; name: string; dimensions?: string | null; graphicDesignPrice?: string | null }> | undefined;
  quantities: Array<{ id: number; quantity: number; price: string }> | undefined;
  addons: Array<{ id: number; name: string; priceType: string; price: string }> | undefined;
  selectedCategoryId: number | null;
  selectedProductId: number | null;
  selectedSizeId: number | null;
  selectedQuantityId: number | null;
  selectedAddonIds: number[];
  onCategoryChange: (categoryId: number | null) => void;
  onProductChange: (productId: number | null) => void;
  onSizeChange: (sizeId: number | null) => void;
  onQuantityChange: (quantityId: number | null) => void;
  onAddonToggle: (addonId: number) => void;
  onProductAdded: (product: SelectedProduct) => void;
  getCategoryValidation: (categoryId: number) => Category | undefined;
}

// Pending product state before file upload
interface PendingProduct {
  id: string;
  productId: number;
  productName: string;
  categoryId: number;
  categoryValidation: Category;
  sizeId: number;
  sizeName: string;
  sizeDimensions?: string | null;
  quantityId: number;
  sizeQuantityId: number;
  quantity: number;
  price: number;
  graphicDesignPrice: number;
  addons?: SelectedAddon[];
}

export function ProductSelectionRow({
  categories,
  products,
  sizes,
  quantities,
  addons,
  selectedCategoryId,
  selectedProductId,
  selectedSizeId,
  selectedQuantityId,
  selectedAddonIds,
  onCategoryChange,
  onProductChange,
  onSizeChange,
  onQuantityChange,
  onAddonToggle,
  onProductAdded,
  getCategoryValidation,
}: ProductSelectionRowProps) {
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if all selections are made
  const canProceed = selectedQuantityId && selectedSizeId && selectedProductId && selectedCategoryId;

  // Create pending product from current selection
  const createPendingProduct = useCallback((): PendingProduct | null => {
    if (!selectedQuantityId || !selectedSizeId || !selectedProductId || !selectedCategoryId) return null;

    const product = products?.find((p) => p.id === selectedProductId);
    const size = sizes?.find((s) => s.id === selectedSizeId);
    const quantity = quantities?.find((q) => q.id === selectedQuantityId);
    const categoryValidation = getCategoryValidation(selectedCategoryId);

    if (!product || !size || !quantity || !categoryValidation) return null;

    const productAddons: SelectedAddon[] = selectedAddonIds
      .map((addonId) => {
        const addon = addons?.find((a) => a.id === addonId);
        if (!addon) return null;
        return {
          id: addon.id,
          name: addon.name,
          priceType: addon.priceType,
          price: parseFloat(addon.price),
        };
      })
      .filter((a): a is SelectedAddon => a !== null);

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      categoryId: selectedCategoryId,
      categoryValidation,
      sizeId: size.id,
      sizeName: size.name,
      sizeDimensions: size.dimensions,
      quantityId: quantity.id,
      sizeQuantityId: quantity.id, // This is the ID to send to API
      quantity: quantity.quantity,
      price: parseFloat(quantity.price),
      graphicDesignPrice: parseFloat(size.graphicDesignPrice || "0"),
      addons: productAddons.length > 0 ? productAddons : undefined,
    };
  }, [selectedCategoryId, selectedProductId, selectedSizeId, selectedQuantityId, selectedAddonIds, products, sizes, quantities, addons, getCategoryValidation]);

  // Handle file upload click
  const handleUploadClick = () => {
    const pending = createPendingProduct();
    if (!pending) return;
    setPendingProduct(pending);
    setUploadError(null);
    fileInputRef.current?.click();
  };

  // Handle "No graphic" button
  const handleNoGraphic = () => {
    const pending = createPendingProduct();
    if (!pending) return;

    // Create product with needsGraphicDesign flag
    const newProduct: SelectedProduct = {
      ...pending,
      needsGraphicDesign: true,
    };

    // Animate and add
    setIsAnimating(true);
    playSuccessSound();
    
    setTimeout(() => {
      onProductAdded(newProduct);
      resetSelection();
      setIsAnimating(false);
      toast.success(`${pending.productName} נוסף - נדרש עיצוב גרפי`);
    }, 500);
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingProduct) return;

    const basicValidation = validateFileBasic(file);
    if (!basicValidation.valid) {
      toast.error(basicValidation.error);
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const imageDimensions = await getImageDimensions(file);

      const { errors, warnings } = await validateFileForProduct(
        file,
        imageDimensions,
        pendingProduct.sizeDimensions,
        pendingProduct.categoryValidation
      );

      // Upload to S3
      const uploadResult = await uploadFileToS3(file);

      if (!uploadResult) {
        setUploadError("שגיאה בהעלאת הקובץ");
        setIsUploading(false);
        e.target.value = "";
        return;
      }

      // Check if there are blocking errors
      if (errors.length > 0) {
        // Show error but allow to choose graphic design
        setUploadError(`הקובץ לא עומד בדרישות: ${errors[0].message}`);
        setIsUploading(false);
        
        // Still create the product with the file and errors
        const newProduct: SelectedProduct = {
          ...pendingProduct,
          file: {
            file,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            preview,
            uploading: false,
            uploaded: true,
            s3Key: uploadResult.key,
            s3Url: uploadResult.url,
            imageDimensions,
            validationErrors: errors,
            validationWarnings: warnings,
          },
        };

        // Animate and add (with errors - user can fix later)
        setIsAnimating(true);
        playSuccessSound();
        
        setTimeout(() => {
          onProductAdded(newProduct);
          resetSelection();
          setIsAnimating(false);
          toast.warning("הקובץ הועלה אך יש בעיות שדורשות טיפול");
        }, 500);
        
        e.target.value = "";
        return;
      }

      // Success - create product with file
      const newProduct: SelectedProduct = {
        ...pendingProduct,
        file: {
          file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preview,
          uploading: false,
          uploaded: true,
          s3Key: uploadResult.key,
          s3Url: uploadResult.url,
          imageDimensions,
          validationErrors: [],
          validationWarnings: warnings,
        },
      };

      // Animate and add
      setIsAnimating(true);
      playSuccessSound();
      
      setTimeout(() => {
        onProductAdded(newProduct);
        resetSelection();
        setIsAnimating(false);
        
        if (warnings.length > 0) {
          toast.success("הקובץ הועלה בהצלחה (עם הערות)");
        } else {
          toast.success("הקובץ הועלה בהצלחה!");
        }
      }, 500);

    } catch (error) {
      setUploadError("שגיאה בעיבוד הקובץ");
    }

    setIsUploading(false);
    e.target.value = "";
  };

  // Reset selection after adding product
  const resetSelection = () => {
    onQuantityChange(null);
    setPendingProduct(null);
    setUploadError(null);
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200/50 transition-all duration-500 ${
      isAnimating ? "scale-95 opacity-50 translate-x-[-20px]" : ""
    }`}>
      <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" />
        בחירת מוצר
      </h2>
      
      {/* 4 Selects in One Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <div className="relative">
          <select
            value={selectedCategoryId || ""}
            onChange={(e) => onCategoryChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-blue-300 transition-colors"
          >
            <option value="">קטגוריה</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select
            value={selectedProductId || ""}
            onChange={(e) => {
              onProductChange(e.target.value ? parseInt(e.target.value) : null);
              onSizeChange(null);
              onQuantityChange(null);
            }}
            disabled={!selectedCategoryId}
            className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200"
          >
            <option value="">מוצר</option>
            {products?.map((prod) => (
              <option key={prod.id} value={prod.id}>{prod.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select
            value={selectedSizeId || ""}
            onChange={(e) => {
              onSizeChange(e.target.value ? parseInt(e.target.value) : null);
              onQuantityChange(null);
            }}
            disabled={!selectedProductId}
            className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200"
          >
            <option value="">גודל</option>
            {sizes?.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name} {size.dimensions && `(${size.dimensions})`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select
            value={selectedQuantityId || ""}
            onChange={(e) => onQuantityChange(e.target.value ? parseInt(e.target.value) : null)}
            disabled={!selectedSizeId}
            className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200"
          >
            <option value="">כמות</option>
            {quantities?.map((qty) => (
              <option key={qty.id} value={qty.id}>{qty.quantity} יח'</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Addons - Inline */}
      {selectedProductId && addons && addons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-slate-500">תוספות:</span>
          {addons.map((addon) => (
            <label
              key={addon.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                selectedAddonIds.includes(addon.id)
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedAddonIds.includes(addon.id)}
                onChange={() => onAddonToggle(addon.id)}
                className="sr-only"
              />
              {addon.name}
            </label>
          ))}
        </div>
      )}

      {/* Action Buttons - Upload File / No Graphic */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <Button
          type="button"
          onClick={handleUploadClick}
          disabled={!canProceed || isUploading}
          size="sm"
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              מעלה...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 ml-1" />
              העלה קובץ
            </>
          )}
        </Button>
        
        <Button
          type="button"
          onClick={handleNoGraphic}
          disabled={!canProceed || isUploading}
          size="sm"
          variant="outline"
          className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
        >
          <Palette className="h-4 w-4 ml-1" />
          אין לי גרפיקה
        </Button>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {uploadError}
          </p>
        </div>
      )}
    </div>
  );
}
