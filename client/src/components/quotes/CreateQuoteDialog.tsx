/**
 * CreateQuoteDialog - טופס יצירת הצעת מחיר חדשה
 * שדות בחירה אינטראקטיביים עם חיפוש
 */

import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Search, X, ChevronDown, Check, 
  Loader2, FileText, Video, File,
  Trash2, Upload, Tag, Rocket, Send, Package
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ==================== INTERFACES ====================

interface Customer {
  id: number;
  name: string;
  companyName?: string | null;
  status: string;
}

interface SelectedAddon {
  id: number;
  name: string;
  price: number;
  priceType: string;
}

interface ProductFile {
  file: File;
  s3Key?: string;
  s3Url?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploading?: boolean;
  error?: string;
}

interface SelectedProduct {
  id: string;
  productId: number;
  productName: string;
  sizeId: number;
  sizeName: string;
  sizeDimensions?: string | null;
  sizeQuantityId: number;
  quantity: number;
  price: number;
  addons: SelectedAddon[];
  file?: ProductFile;
}

interface CreateQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
}

// ==================== COMBOBOX COMPONENT ====================

interface ComboboxOption {
  id: number;
  label: string;
  sublabel?: string;
  price?: string;
}

function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder,
  disabled,
  className
}: { 
  options: ComboboxOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(searchLower) ||
      o.sublabel?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div 
        className={`flex items-center border rounded-lg bg-white cursor-pointer transition-all ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={isOpen ? search : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        />
        {value && !isOpen && (
          <button onClick={handleClear} className="p-1 mr-1 hover:bg-slate-100 rounded">
            <X className="h-3 w-3 text-slate-400" />
          </button>
        )}
        <ChevronDown className={`h-4 w-4 text-slate-400 ml-2 mr-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">לא נמצאו תוצאות</div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.id}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                  option.id === value ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelect(option.id)}
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-slate-500">{option.sublabel}</div>
                  )}
                </div>
                {option.price && (
                  <span className="text-sm font-semibold text-emerald-600">₪{option.price}</span>
                )}
                {option.id === value && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ==================== FILE UPLOAD HELPER ====================

async function uploadFileToS3(file: File): Promise<{ s3Key: string; s3Url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
  
  return response.json();
}

// ==================== FILE THUMBNAIL ====================

function FileThumbnail({ file, onRemove }: { file: ProductFile; onRemove: () => void }) {
  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden group">
      {file.uploading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        </div>
      ) : file.s3Url && isImage ? (
        <img src={file.s3Url} alt={file.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          {isPdf && <FileText className="h-5 w-5 text-red-500" />}
          {isVideo && <Video className="h-5 w-5 text-purple-500" />}
          {!isPdf && !isVideo && <File className="h-5 w-5 text-slate-400" />}
        </div>
      )}
      
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-2 w-2 text-white" />
      </button>
    </div>
  );
}

// ==================== PRODUCT ROW ====================

function ProductRow({ 
  product, 
  onRemove,
  onFileUpload,
  onFileRemove
}: { 
  product: SelectedProduct;
  onRemove: () => void;
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalAddonsPrice = product.addons.reduce((sum, addon) => {
    if (addon.priceType === 'fixed') return sum + addon.price;
    if (addon.priceType === 'percentage') return sum + (product.price * addon.price / 100);
    return sum;
  }, 0);
  
  const totalPrice = product.price + totalAddonsPrice;

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {/* File */}
      <div className="shrink-0">
        {product.file ? (
          <FileThumbnail file={product.file} onRemove={onFileRemove} />
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center bg-white hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4 text-slate-400" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.ai,.eps,.psd"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{product.productName}</div>
        <div className="text-xs text-slate-500">
          {product.sizeName} • {product.quantity} יח'
          {product.addons.length > 0 && ` • ${product.addons.length} תוספות`}
        </div>
      </div>

      {/* Price */}
      <div className="text-sm font-bold text-emerald-600 shrink-0">
        ₪{totalPrice.toFixed(0)}
      </div>

      {/* Remove */}
      <button onClick={onRemove} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function CreateQuoteDialog({
  isOpen,
  onClose,
  onSuccess,
  customers,
}: CreateQuoteDialogProps) {
  // Customer selection
  const [customerId, setCustomerId] = useState<number | null>(null);
  
  // Product selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  
  // Products list
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Notes
  const [notes, setNotes] = useState("");
  
  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================== API QUERIES ====================
  
  const { data: categories } = trpc.products.getCategories.useQuery();
  const { data: products } = trpc.products.list.useQuery(
    { categoryId: selectedCategoryId! },
    { enabled: !!selectedCategoryId }
  );
  const { data: sizes } = trpc.products.getSizes.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );
  const { data: quantities } = trpc.products.getSizeQuantities.useQuery(
    { sizeId: selectedSizeId! },
    { enabled: !!selectedSizeId }
  );
  const { data: addons } = trpc.products.getAddons.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  // ==================== API MUTATIONS ====================
  
  const createQuoteMutation = trpc.quotes.create.useMutation();

  // ==================== COMPUTED OPTIONS ====================
  
  const customerOptions: ComboboxOption[] = useMemo(() => 
    customers
      .filter(c => c.status === 'active')
      .map(c => ({
        id: c.id,
        label: c.name || 'ללא שם',
        sublabel: c.companyName || undefined,
      }))
  , [customers]);

  const categoryOptions: ComboboxOption[] = useMemo(() => 
    categories?.map(c => ({ id: c.id, label: c.name })) || []
  , [categories]);

  const productOptions: ComboboxOption[] = useMemo(() => 
    products?.map(p => ({ id: p.id, label: p.name })) || []
  , [products]);

  const sizeOptions: ComboboxOption[] = useMemo(() => 
    sizes?.map(s => ({ 
      id: s.id, 
      label: s.name,
      sublabel: s.dimensions || undefined 
    })) || []
  , [sizes]);

  const quantityOptions: ComboboxOption[] = useMemo(() => 
    quantities?.map(q => ({ 
      id: q.id, 
      label: `${q.quantity} יח'`,
      price: q.price 
    })) || []
  , [quantities]);

  // ==================== COMPUTED VALUES ====================
  
  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const selectedSize = sizes?.find(s => s.id === selectedSizeId);
  const selectedQuantity = quantities?.find(q => q.id === selectedQuantityId);
  
  const canAddProduct = selectedCategoryId && selectedProductId && selectedSizeId && selectedQuantityId;
  
  const totalPrice = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      const addonsPrice = product.addons.reduce((aSum, addon) => {
        if (addon.priceType === 'fixed') return aSum + addon.price;
        if (addon.priceType === 'percentage') return aSum + (product.price * addon.price / 100);
        return aSum;
      }, 0);
      return sum + product.price + addonsPrice;
    }, 0);
  }, [selectedProducts]);

  // ==================== HANDLERS ====================
  
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
  };

  const handleProductChange = (productId: number | null) => {
    setSelectedProductId(productId);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
  };

  const handleSizeChange = (sizeId: number | null) => {
    setSelectedSizeId(sizeId);
    setSelectedQuantityId(null);
  };

  const handleAddonToggle = (addonId: number) => {
    setSelectedAddonIds(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddProduct = () => {
    if (!canAddProduct || !selectedProduct || !selectedSize || !selectedQuantity) return;

    const selectedAddons: SelectedAddon[] = selectedAddonIds
      .map(id => addons?.find(a => a.id === id))
      .filter(Boolean)
      .map(addon => ({
        id: addon!.id,
        name: addon!.name,
        price: parseFloat(addon!.price),
        priceType: addon!.priceType,
      }));

    const newProduct: SelectedProduct = {
      id: `${Date.now()}-${Math.random()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sizeId: selectedSize.id,
      sizeName: selectedSize.name,
      sizeDimensions: selectedSize.dimensions,
      sizeQuantityId: selectedQuantity.id,
      quantity: selectedQuantity.quantity,
      price: parseFloat(selectedQuantity.price),
      addons: selectedAddons,
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    
    // Reset selection (keep category)
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
    
    toast.success("המוצר נוסף");
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleFileUpload = async (productId: string, file: File) => {
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, file: { file, fileName: file.name, fileSize: file.size, mimeType: file.type, uploading: true } }
        : p
    ));

    try {
      const { s3Key, s3Url } = await uploadFileToS3(file);
      
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, file: { file, fileName: file.name, fileSize: file.size, mimeType: file.type, s3Key, s3Url, uploading: false } }
          : p
      ));
      
      toast.success("הקובץ הועלה");
    } catch (error) {
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, file: { file, fileName: file.name, fileSize: file.size, mimeType: file.type, uploading: false, error: 'שגיאה' } }
          : p
      ));
      toast.error("שגיאה בהעלאה");
    }
  };

  const handleFileRemove = (productId: string) => {
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, file: undefined } : p
    ));
  };

  const handleSubmit = async (sendToProduction: boolean) => {
    if (!customerId || selectedProducts.length === 0) return;

    setIsSubmitting(true);
    
    try {
      const items = selectedProducts.map(p => ({
        sizeQuantityId: p.sizeQuantityId,
        quantity: 1,
        priceAtTimeOfQuote: p.price,
        addonIds: p.addons.map(a => a.id),
        attachment: p.file?.s3Url ? {
          fileName: p.file.fileName,
          fileUrl: p.file.s3Url,
          fileSize: p.file.fileSize,
          mimeType: p.file.mimeType,
        } : undefined,
      }));

      await createQuoteMutation.mutateAsync({
        customerId,
        items,
        notes,
        status: sendToProduction ? 'approved' : 'draft',
      });

      toast.success(sendToProduction ? "הועבר לייצור!" : "ההצעה נוצרה!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error("שגיאה: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomerId(null);
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
    setSelectedProducts([]);
    setNotes("");
    onClose();
  };

  // ==================== RENDER ====================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-lg font-bold">הצעת מחיר חדשה</DialogTitle>
          <DialogDescription className="text-sm">בחר לקוח, הוסף מוצרים וקבצים</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* ==================== CUSTOMER ==================== */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">לקוח</Label>
            <Combobox
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder="בחר או חפש לקוח..."
            />
          </div>

          {/* ==================== PRODUCT SELECTION ==================== */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Package className="h-4 w-4 text-blue-600" />
              הוספת מוצר
            </div>
            
            {/* Selection Row */}
            <div className="grid grid-cols-2 gap-2">
              <Combobox
                options={categoryOptions}
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                placeholder="קטגוריה"
              />
              <Combobox
                options={productOptions}
                value={selectedProductId}
                onChange={handleProductChange}
                placeholder="מוצר"
                disabled={!selectedCategoryId}
              />
              <Combobox
                options={sizeOptions}
                value={selectedSizeId}
                onChange={handleSizeChange}
                placeholder="גודל"
                disabled={!selectedProductId}
              />
              <Combobox
                options={quantityOptions}
                value={selectedQuantityId}
                onChange={setSelectedQuantityId}
                placeholder="כמות"
                disabled={!selectedSizeId}
              />
            </div>

            {/* Addons */}
            {selectedProductId && addons && addons.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  תוספות
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {addons.map(addon => (
                    <button
                      key={addon.id}
                      onClick={() => handleAddonToggle(addon.id)}
                      className={`px-2 py-1 rounded-full border text-xs transition-all ${
                        selectedAddonIds.includes(addon.id)
                          ? 'bg-purple-100 text-purple-900 border-purple-400'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {addon.name}
                      <span className="mr-1 text-emerald-600">
                        {addon.priceType === 'fixed' ? `+₪${addon.price}` : `+${addon.price}%`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Button */}
            <Button
              onClick={handleAddProduct}
              disabled={!canAddProduct}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-1" />
              הוסף לרשימה
            </Button>
          </div>

          {/* ==================== PRODUCTS LIST ==================== */}
          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  מוצרים ({selectedProducts.length})
                </Label>
                <span className="text-sm font-bold text-emerald-600">
                  סה"כ: ₪{totalPrice.toFixed(0)}
                </span>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onRemove={() => handleRemoveProduct(product.id)}
                    onFileUpload={(file) => handleFileUpload(product.id, file)}
                    onFileRemove={() => handleFileRemove(product.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ==================== NOTES ==================== */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות להצעה..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <DialogFooter className="pt-3 border-t gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} size="sm">
            ביטול
          </Button>
          
          {/* צור הצעה - כתום */}
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !customerId || selectedProducts.length === 0}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Send className="h-4 w-4 ml-1" />}
            צור הצעה
          </Button>
          
          {/* העבר לייצור - כחול */}
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !customerId || selectedProducts.length === 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Rocket className="h-4 w-4 ml-1" />}
            העבר לייצור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
