import { useState } from "react";
import { toast } from "sonner";
import type { QuoteItem, CreateQuoteForm } from "@/types/quotes";

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

/**
 * Hook for managing the create quote form state
 * Handles product selection, item management, and form validation
 */
export function useCreateQuoteForm(products: Product[] = []) {
  // Form state
  const [createForm, setCreateForm] = useState<CreateQuoteForm>({
    notes: "",
    items: [],
    customerId: null,
    files: [],
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

  // Add item to form
  const addItem = () => {
    if (!selectedSizeQuantityId || itemQuantity < 1) {
      toast.error("יש לבחור מוצר, גודל וכמות");
      return false;
    }

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
    resetItemSelection();
    return true;
  };

  // Remove item from form
  const removeItem = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Reset item selection state
  const resetItemSelection = () => {
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedSizeQuantityId("");
    setProductSearch("");
    setItemQuantity(1);
    setItemNotes("");
  };

  // Reset entire form
  const resetForm = () => {
    setCreateForm({ notes: "", items: [], customerId: null, files: [] });
    setCustomerSearch("");
    resetItemSelection();
  };

  // Set customer
  const setCustomer = (customerId: number, customerName: string, companyName?: string) => {
    setCreateForm(prev => ({ ...prev, customerId }));
    setCustomerSearch(customerName + (companyName ? ` (${companyName})` : ''));
  };

  // Clear customer
  const clearCustomer = () => {
    setCreateForm(prev => ({ ...prev, customerId: null }));
    setCustomerSearch('');
  };

  // Set notes
  const setNotes = (notes: string) => {
    setCreateForm(prev => ({ ...prev, notes }));
  };

  // Add files
  const addFiles = (files: File[]) => {
    setCreateForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
  };

  // Remove file
  const removeFile = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  // Select product
  const selectProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    setSelectedProductId(productId);
    setProductSearch(product?.name || '');
    setSelectedSizeId(null);
    setSelectedSizeQuantityId('');
  };

  // Select size
  const selectSize = (sizeId: number) => {
    setSelectedSizeId(sizeId);
    setSelectedSizeQuantityId('');
  };

  // Validate form
  const validateForm = (): { valid: boolean; error?: string } => {
    if (createForm.items.length === 0) {
      return { valid: false, error: "יש להוסיף לפחות פריט אחד" };
    }
    if (!createForm.customerId) {
      return { valid: false, error: "יש לבחור לקוח" };
    }
    return { valid: true };
  };

  // Get form data for submission
  const getFormData = () => ({
    customerId: createForm.customerId!,
    items: createForm.items,
    notes: createForm.notes,
  });

  return {
    // Form state
    createForm,
    customerSearch,
    productSearch,
    selectedProductId,
    selectedSizeId,
    selectedSizeQuantityId,
    itemQuantity,
    itemNotes,

    // Computed
    selectedProduct,
    selectedSize,
    availableQuantities,

    // Setters
    setCustomerSearch,
    setProductSearch,
    setSelectedSizeQuantityId,
    setItemQuantity,
    setItemNotes,

    // Actions
    addItem,
    removeItem,
    resetForm,
    setCustomer,
    clearCustomer,
    setNotes,
    addFiles,
    removeFile,
    selectProduct,
    selectSize,
    validateForm,
    getFormData,
  };
}
