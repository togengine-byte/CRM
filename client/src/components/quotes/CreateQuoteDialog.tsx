import { useState } from "react";
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
import { Plus, Search, X, FileUp } from "lucide-react";
import type { QuoteItem } from "@/types/quotes";

interface Product {
  id: number;
  name: string;
  sizes?: {
    id: number;
    name: string;
    dimensions?: string;
    quantities?: {
      id: number;
      quantity: number;
    }[];
  }[];
}

interface Customer {
  id: number;
  name: string;
  companyName?: string | null;
  status: string;
}

interface CreateQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { customerId: number; items: QuoteItem[]; notes: string }) => void;
  isLoading: boolean;
  products: Product[];
  customers: Customer[];
}

export function CreateQuoteDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  products,
  customers,
}: CreateQuoteDialogProps) {
  // Form state
  const [createForm, setCreateForm] = useState({
    notes: "",
    items: [] as QuoteItem[],
    customerId: null as number | null,
    files: [] as File[],
  });

  // Selection state
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedSizeQuantityId, setSelectedSizeQuantityId] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState("");

  // Get selected product and size info
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedSize = selectedProduct?.sizes?.find(s => s.id === selectedSizeId);
  const availableQuantities = selectedSize?.quantities || [];

  const handleAddItem = () => {
    if (!selectedSizeQuantityId || itemQuantity < 1) return;

    const sq = availableQuantities.find(q => q.id === parseInt(selectedSizeQuantityId));
    const productName = selectedProduct?.name || '';
    const sizeName = selectedSize ? `${selectedSize.name} (${sq?.quantity || ''} יח')` : '';

    setCreateForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sizeQuantityId: parseInt(selectedSizeQuantityId),
          quantity: itemQuantity,
          notes: itemNotes || undefined,
          productName,
          sizeName,
        },
      ],
    }));

    // Reset item selection
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedSizeQuantityId("");
    setProductSearch("");
    setItemQuantity(1);
    setItemNotes("");
  };

  const handleRemoveItem = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!createForm.customerId || createForm.items.length === 0) return;
    
    onSubmit({
      customerId: createForm.customerId,
      items: createForm.items,
      notes: createForm.notes,
    });
  };

  const resetForm = () => {
    setCreateForm({ notes: "", items: [], customerId: null, files: [] });
    setCustomerSearch("");
    setProductSearch("");
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedSizeQuantityId("");
    setItemQuantity(1);
    setItemNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>הצעת מחיר חדשה</DialogTitle>
          <DialogDescription>הוסף פריטים ליצירת הצעת מחיר</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Customer Selection with Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">לקוח</Label>
            <div className="relative">
              <Input
                placeholder="הקלד שם לקוח לחיפוש..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pr-8"
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {customerSearch && (
              <div className="border rounded-md max-h-32 overflow-y-auto">
                {customers
                  .filter((c) => 
                    c.status === 'active' && 
                    (c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                     c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()))
                  )
                  .slice(0, 5)
                  .map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                      onClick={() => {
                        setCreateForm({ ...createForm, customerId: customer.id });
                        setCustomerSearch(customer.name + (customer.companyName ? ` (${customer.companyName})` : ''));
                      }}
                    >
                      {customer.name} {customer.companyName ? `(${customer.companyName})` : ''}
                    </div>
                  ))}
              </div>
            )}
            {createForm.customerId && !customerSearch.includes(customers.find(c => c.id === createForm.customerId)?.name || '') && (
              <Badge variant="secondary" className="mt-1">
                {customers.find(c => c.id === createForm.customerId)?.name}
                <X className="h-3 w-3 mr-1 cursor-pointer" onClick={() => {
                  setCreateForm({ ...createForm, customerId: null });
                  setCustomerSearch('');
                }} />
              </Badge>
            )}
          </div>

          {/* Product Selection */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">הוספת פריט</Label>
            
            {/* Product Search */}
            <div className="relative">
              <Input
                placeholder="חפש מוצר..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedProductId(null);
                  setSelectedSizeId(null);
                  setSelectedSizeQuantityId('');
                }}
                className="pr-8"
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Product Results */}
            {productSearch && !selectedProductId && (
              <div className="border rounded-md max-h-32 overflow-y-auto bg-background">
                {products
                  .filter((p) => p.name?.toLowerCase().includes(productSearch.toLowerCase()))
                  .slice(0, 5)
                  .map((product) => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-muted cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setProductSearch(product.name);
                      }}
                    >
                      {product.name}
                    </div>
                  ))}
              </div>
            )}

            {/* Size Selection */}
            {selectedProductId && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">גודל</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct?.sizes?.map((size) => (
                    <Button
                      key={size.id}
                      variant={selectedSizeId === size.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedSizeId(size.id);
                        setSelectedSizeQuantityId('');
                      }}
                      className="flex-col h-auto py-2"
                    >
                      <span>{size.name}</span>
                      {size.dimensions && (
                        <span className="text-xs opacity-70">{size.dimensions}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            {selectedSizeId && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">כמות באריזה</Label>
                {availableQuantities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableQuantities.map((sq) => (
                      <Button
                        key={sq.id}
                        variant={selectedSizeQuantityId === sq.id.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSizeQuantityId(sq.id.toString())}
                      >
                        {sq.quantity} יח'
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">אין כמויות מוגדרות לגודל זה</p>
                )}
              </div>
            )}

            {/* Order Quantity & Notes */}
            {selectedSizeQuantityId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">כמה להזמין?</Label>
                  <Input
                    type="number"
                    min={1}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">הערה</Label>
                  <Input
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="אופציונלי"
                  />
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={handleAddItem} 
              className="w-full"
              disabled={!selectedSizeQuantityId}
            >
              <Plus className="ml-2 h-4 w-4" />
              הוסף לרשימה
            </Button>
          </div>

          {/* Items List */}
          {createForm.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">פריטים ({createForm.items.length})</Label>
              {createForm.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                >
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-muted-foreground"> - {item.sizeName} × {item.quantity}</span>
                    {item.notes && <span className="text-muted-foreground text-xs block">{item.notes}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-sm">הערות</Label>
            <Textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="הערות להצעה..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-sm">קבצים</Label>
            <div className="mt-1 border-2 border-dashed rounded-lg p-3 text-center">
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setCreateForm({ ...createForm, files: [...createForm.files, ...files] });
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileUp className="h-6 w-6 mx-auto text-muted-foreground" />
                <span className="text-xs text-muted-foreground">לחץ להעלאת קבצים</span>
              </label>
            </div>
            {createForm.files.length > 0 && (
              <div className="mt-2 space-y-1">
                {createForm.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-muted p-1 rounded">
                    <span className="truncate">{file.name}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setCreateForm({ 
                        ...createForm, 
                        files: createForm.files.filter((_, i) => i !== index) 
                      })} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            ביטול
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !createForm.customerId || createForm.items.length === 0}
          >
            {isLoading ? "יוצר..." : "צור הצעת מחיר"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
