/**
 * CreateQuoteDialog - טופס יצירת הצעת מחיר חדשה
 * עיצוב מודרני כמו דף נחיתה
 * תמיכה בבחירת מוצרים, תוספות, והעלאת קבצים
 */

import { useState, useRef, useMemo } from "react";
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
  Plus, Search, X, FileUp, Package, ChevronDown, Check, 
  Loader2, Image as ImageIcon, FileText, Video, File,
  Trash2, Upload, Tag, Rocket, Send
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
  id: string; // unique id for UI
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
    <div className="relative w-16 h-16 rounded-lg border-2 border-slate-200 overflow-hidden group">
      {file.uploading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </div>
      ) : file.s3Url && isImage ? (
        <img src={file.s3Url} alt={file.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          {isPdf && <FileText className="h-6 w-6 text-red-500" />}
          {isVideo && <Video className="h-6 w-6 text-purple-500" />}
          {!isPdf && !isVideo && <File className="h-6 w-6 text-slate-400" />}
        </div>
      )}
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3 text-white" />
      </button>
      
      {/* File name */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
        <p className="text-[8px] text-white truncate">{file.fileName}</p>
      </div>
    </div>
  );
}

// ==================== PRODUCT CARD ====================

function ProductCard({ 
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
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium text-slate-900 truncate">{product.productName}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          <span>{product.sizeName}</span>
          {product.sizeDimensions && (
            <>
              <span>•</span>
              <span>{product.sizeDimensions}</span>
            </>
          )}
          <span>•</span>
          <span>{product.quantity} יח'</span>
        </div>
        {product.addons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.addons.map(addon => (
              <Badge key={addon.id} variant="secondary" className="text-[10px] py-0">
                {addon.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-1 text-sm font-semibold text-emerald-600">
          ₪{totalPrice.toFixed(2)}
        </div>
      </div>

      {/* File Upload Area */}
      <div className="shrink-0">
        {product.file ? (
          <FileThumbnail file={product.file} onRemove={onFileRemove} />
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-5 w-5 text-slate-400" />
            <span className="text-[9px] text-slate-400 mt-1">העלה קובץ</span>
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

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
      >
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
  const [customerSearch, setCustomerSearch] = useState("");
  
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

  // ==================== COMPUTED VALUES ====================
  
  const selectedCustomer = customers.find(c => c.id === customerId);
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
    
    // Reset selection
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
    
    toast.success("המוצר נוסף לרשימה");
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleFileUpload = async (productId: string, file: File) => {
    // Update product with uploading state
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
      
      toast.success("הקובץ הועלה בהצלחה");
    } catch (error) {
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, file: { file, fileName: file.name, fileSize: file.size, mimeType: file.type, uploading: false, error: 'שגיאה בהעלאה' } }
          : p
      ));
      toast.error("שגיאה בהעלאת הקובץ");
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
      // Prepare items
      const items = selectedProducts.map(p => ({
        sizeQuantityId: p.sizeQuantityId,
        quantity: 1, // כמות הזמנות (לא כמות יחידות)
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

      toast.success(sendToProduction ? "ההצעה נוצרה והועברה לייצור!" : "הצעת המחיר נוצרה בהצלחה!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error("שגיאה ביצירת ההצעה: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomerId(null);
    setCustomerSearch("");
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold text-slate-900">הצעת מחיר חדשה</DialogTitle>
          <DialogDescription>בחר לקוח, הוסף מוצרים וקבצים</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* ==================== CUSTOMER SELECTION ==================== */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">בחירת לקוח</Label>
            <div className="relative">
              <Input
                placeholder="חפש לקוח לפי שם או חברה..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            
            {customerSearch && !customerId && (
              <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg">
                {customers
                  .filter(c => 
                    c.status === 'active' && 
                    (c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                     c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()))
                  )
                  .slice(0, 8)
                  .map(customer => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        setCustomerId(customer.id);
                        setCustomerSearch(customer.name + (customer.companyName ? ` (${customer.companyName})` : ''));
                      }}
                    >
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      {customer.companyName && (
                        <div className="text-xs text-slate-500">{customer.companyName}</div>
                      )}
                    </div>
                  ))}
                {customers.filter(c => 
                  c.status === 'active' && 
                  (c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                   c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()))
                ).length === 0 && (
                  <div className="p-3 text-sm text-slate-500 text-center">לא נמצאו לקוחות</div>
                )}
              </div>
            )}
            
            {selectedCustomer && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <Check className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{selectedCustomer.name}</span>
                {selectedCustomer.companyName && (
                  <span className="text-xs text-blue-600">({selectedCustomer.companyName})</span>
                )}
                <button 
                  onClick={() => { setCustomerId(null); setCustomerSearch(''); }}
                  className="mr-auto p-1 hover:bg-blue-100 rounded"
                >
                  <X className="h-3 w-3 text-blue-600" />
                </button>
              </div>
            )}
          </div>

          {/* ==================== PRODUCT SELECTION ==================== */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              הוספת מוצר
            </Label>
            
            {/* Category Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories?.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedCategoryId === category.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Product Selection */}
            {selectedCategoryId && products && products.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">מוצר</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductChange(product.id)}
                      className={`p-2 rounded-lg border text-sm transition-all ${
                        selectedProductId === product.id
                          ? 'bg-blue-100 text-blue-900 border-blue-400'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {selectedProductId && sizes && sizes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">גודל</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => handleSizeChange(size.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedSizeId === size.id
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div>{size.name}</div>
                      {size.dimensions && (
                        <div className="text-[10px] text-slate-500">{size.dimensions}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            {selectedSizeId && quantities && quantities.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">כמות</Label>
                <div className="flex flex-wrap gap-2">
                  {quantities.map(qty => (
                    <button
                      key={qty.id}
                      onClick={() => setSelectedQuantityId(qty.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedQuantityId === qty.id
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div>{qty.quantity} יח'</div>
                      <div className="text-xs font-semibold text-emerald-600">₪{qty.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Addons Selection */}
            {selectedProductId && addons && addons.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  תוספות
                </Label>
                <div className="flex flex-wrap gap-2">
                  {addons.map(addon => (
                    <button
                      key={addon.id}
                      onClick={() => handleAddonToggle(addon.id)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
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

            {/* Add Product Button */}
            <Button
              onClick={handleAddProduct}
              disabled={!canAddProduct}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-2" />
              הוסף מוצר לרשימה
            </Button>
          </div>

          {/* ==================== SELECTED PRODUCTS LIST ==================== */}
          {selectedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">
                  מוצרים נבחרים ({selectedProducts.length})
                </Label>
                <div className="text-lg font-bold text-emerald-600">
                  סה"כ: ₪{totalPrice.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-2">
                {selectedProducts.map(product => (
                  <ProductCard
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות להצעת המחיר..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <DialogFooter className="pt-4 border-t gap-2 sm:gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            ביטול
          </Button>
          
          {/* צור הצעה - כתום */}
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !customerId || selectedProducts.length === 0}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Send className="h-4 w-4 ml-2" />
            )}
            צור הצעה
          </Button>
          
          {/* העבר לייצור - כחול */}
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !customerId || selectedProducts.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Rocket className="h-4 w-4 ml-2" />
            )}
            העבר לייצור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
