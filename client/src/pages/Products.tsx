import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Search,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  Printer,
  Maximize,
  SignpostBig,
  Shirt,
  Flame,
  Ruler,
  Sparkles,
  DollarSign,
} from "lucide-react";
import {
  ProductDialog,
  SizeDialog,
  QuantityDialog,
  AddonDialog,
} from "@/components/products";
import type {
  Category,
  Product,
  ProductSize,
  SizeQuantity,
  ProductAddon,
  ProductFormData,
  SizeFormData,
  QuantityFormData,
  AddonFormData,
} from "@/types/products";

// Icon mapping for categories
const categoryIcons: Record<string, any> = {
  'Printer': Printer,
  'Maximize': Maximize,
  'SignpostBig': SignpostBig,
  'Shirt': Shirt,
  'Flame': Flame,
};

// Types imported from @/types/products

export default function Products() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [initialCategorySet, setInitialCategorySet] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [expandedSizeId, setExpandedSizeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isAddonDialogOpen, setIsAddonDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Form states
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    description: "",
    categoryId: null,
    allowCustomQuantity: true,
  });

  const [sizeForm, setSizeForm] = useState<SizeFormData>({
    name: "",
    dimensions: "",
  });

  const [quantityForm, setQuantityForm] = useState<QuantityFormData>({
    quantity: "",
    price: "",
  });

  const [addonForm, setAddonForm] = useState<AddonFormData>({
    name: "",
    description: "",
    priceType: "fixed",
    price: "",
  });

  // Fetch categories
  const { data: categoriesData } = trpc.products.getCategories.useQuery();
  const categories = categoriesData || [];

  // Set first category as default
  useEffect(() => {
    if (categories.length > 0 && !initialCategorySet) {
      setSelectedCategoryId(categories[0].id);
      setInitialCategorySet(true);
    }
  }, [categories, initialCategorySet]);

  // Fetch products with details
  const { data: products, isLoading, refetch } = trpc.products.listWithDetails.useQuery(
    { categoryId: selectedCategoryId || undefined },
    { enabled: selectedCategoryId !== null }
  );

  // Fetch sizes for expanded product
  const { data: sizesData, refetch: refetchSizes } = trpc.products.getSizes.useQuery(
    { productId: expandedProductId! },
    { enabled: expandedProductId !== null }
  );

  // Fetch quantities for expanded size
  const { data: quantitiesData, refetch: refetchQuantities } = trpc.products.getSizeQuantities.useQuery(
    { sizeId: expandedSizeId! },
    { enabled: expandedSizeId !== null }
  );

  // Fetch addons for expanded product
  const { data: addonsData, refetch: refetchAddons } = trpc.products.getAddons.useQuery(
    { productId: expandedProductId! },
    { enabled: expandedProductId !== null }
  );

  // Mutations
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("המוצר נוצר בהצלחה");
      setIsProductDialogOpen(false);
      resetProductForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("המוצר עודכן בהצלחה");
      setIsProductDialogOpen(false);
      resetProductForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("המוצר נמחק בהצלחה");
      setExpandedProductId(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Size mutations
  const createSizeMutation = trpc.products.createSize.useMutation({
    onSuccess: () => {
      toast.success("הגודל נוסף בהצלחה");
      setIsSizeDialogOpen(false);
      resetSizeForm();
      refetchSizes();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSizeMutation = trpc.products.updateSize.useMutation({
    onSuccess: () => {
      toast.success("הגודל עודכן בהצלחה");
      setIsSizeDialogOpen(false);
      resetSizeForm();
      refetchSizes();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSizeMutation = trpc.products.deleteSize.useMutation({
    onSuccess: () => {
      toast.success("הגודל נמחק בהצלחה");
      setExpandedSizeId(null);
      refetchSizes();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Quantity mutations
  const createQuantityMutation = trpc.products.createSizeQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות נוספה בהצלחה");
      setIsQuantityDialogOpen(false);
      resetQuantityForm();
      refetchQuantities();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateQuantityMutation = trpc.products.updateSizeQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות עודכנה בהצלחה");
      setIsQuantityDialogOpen(false);
      resetQuantityForm();
      refetchQuantities();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteQuantityMutation = trpc.products.deleteSizeQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות נמחקה בהצלחה");
      refetchQuantities();
    },
    onError: (error) => toast.error(error.message),
  });

  // Addon mutations
  const createAddonMutation = trpc.products.createAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת נוספה בהצלחה");
      setIsAddonDialogOpen(false);
      resetAddonForm();
      refetchAddons();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAddonMutation = trpc.products.updateAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת עודכנה בהצלחה");
      setIsAddonDialogOpen(false);
      resetAddonForm();
      refetchAddons();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAddonMutation = trpc.products.deleteAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת נמחקה בהצלחה");
      refetchAddons();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Reset functions
  const resetProductForm = () => {
    setProductForm({ name: "", description: "", categoryId: selectedCategoryId, allowCustomQuantity: true });
    setIsEditMode(false);
    setSelectedProductId(null);
  };

  const resetSizeForm = () => {
    setSizeForm({ name: "", dimensions: "" });
    setIsEditMode(false);
    setSelectedItemId(null);
  };

  const resetQuantityForm = () => {
    setQuantityForm({ quantity: "", price: "" });
    setIsEditMode(false);
    setSelectedItemId(null);
  };

  const resetAddonForm = () => {
    setAddonForm({ name: "", description: "", priceType: "fixed", price: "" });
    setIsEditMode(false);
    setSelectedItemId(null);
  };

  // Toggle product expansion
  const toggleProduct = (productId: number) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      setExpandedSizeId(null);
    } else {
      setExpandedProductId(productId);
      setExpandedSizeId(null);
    }
  };

  // Toggle size expansion (for quantities)
  const toggleSize = (sizeId: number) => {
    if (expandedSizeId === sizeId) {
      setExpandedSizeId(null);
    } else {
      setExpandedSizeId(sizeId);
    }
  };

  // Filter products
  const filteredProducts = products?.filter((product: Product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sizes?.some(s => s.name.toLowerCase().includes(query)) ||
      product.addons?.some(a => a.name.toLowerCase().includes(query))
    );
  }) || [];

  // Handle product submit
  const handleProductSubmit = () => {
    if (!productForm.name) {
      toast.error("שם המוצר נדרש");
      return;
    }

    if (isEditMode && selectedProductId) {
      updateProductMutation.mutate({
        id: selectedProductId,
        name: productForm.name,
        description: productForm.description || undefined,
        categoryId: productForm.categoryId || undefined,
      });
    } else {
      createProductMutation.mutate({
        name: productForm.name,
        description: productForm.description || undefined,
        categoryId: productForm.categoryId || undefined,
      });
    }
  };

  // Handle size submit
  const handleSizeSubmit = () => {
    if (!sizeForm.name) {
      toast.error("שם הגודל נדרש");
      return;
    }

    if (isEditMode && selectedItemId) {
      updateSizeMutation.mutate({
        id: selectedItemId,
        name: sizeForm.name,
        dimensions: sizeForm.dimensions || undefined,
        basePrice: 0,
      });
    } else if (selectedProductId) {
      createSizeMutation.mutate({
        productId: selectedProductId,
        name: sizeForm.name,
        dimensions: sizeForm.dimensions || undefined,
        basePrice: 0,
      });
    }
  };

  // Handle quantity submit
  const handleQuantitySubmit = () => {
    if (!quantityForm.quantity || !quantityForm.price) {
      toast.error("כמות ומחיר נדרשים");
      return;
    }

    if (isEditMode && selectedItemId) {
      updateQuantityMutation.mutate({
        id: selectedItemId,
        quantity: parseInt(quantityForm.quantity),
        price: parseFloat(quantityForm.price),
      });
    } else if (selectedSizeId) {
      createQuantityMutation.mutate({
        sizeId: selectedSizeId,
        quantity: parseInt(quantityForm.quantity),
        price: parseFloat(quantityForm.price),
      });
    }
  };

  // Handle addon submit
  const handleAddonSubmit = () => {
    if (!addonForm.name || !addonForm.price) {
      toast.error("שם ומחיר נדרשים");
      return;
    }

    if (isEditMode && selectedItemId) {
      updateAddonMutation.mutate({
        id: selectedItemId,
        name: addonForm.name,
        description: addonForm.description || undefined,
        priceType: addonForm.priceType,
        price: parseFloat(addonForm.price),
      });
    } else if (selectedProductId) {
      createAddonMutation.mutate({
        productId: selectedProductId,
        name: addonForm.name,
        description: addonForm.description || undefined,
        priceType: addonForm.priceType,
        price: parseFloat(addonForm.price),
      });
    }
  };

  // Open edit dialogs
  const openEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId,
      allowCustomQuantity: product.allowCustomQuantity ?? true,
    });
    setSelectedProductId(product.id);
    setIsEditMode(true);
    setIsProductDialogOpen(true);
  };

  const openEditSize = (size: ProductSize, productId: number) => {
    setSizeForm({
      name: size.name,
      dimensions: size.dimensions || "",
    });
    setSelectedProductId(productId);
    setSelectedItemId(size.id);
    setIsEditMode(true);
    setIsSizeDialogOpen(true);
  };

  const openEditQuantity = (quantity: SizeQuantity) => {
    setQuantityForm({
      quantity: quantity.quantity.toString(),
      price: quantity.price,
    });
    setSelectedItemId(quantity.id);
    setIsEditMode(true);
    setIsQuantityDialogOpen(true);
  };

  const openEditAddon = (addon: ProductAddon, productId: number) => {
    setAddonForm({
      name: addon.name,
      description: addon.description || "",
      priceType: addon.priceType as "fixed" | "percentage" | "per_unit",
      price: addon.price,
    });
    setSelectedProductId(productId);
    setSelectedItemId(addon.id);
    setIsEditMode(true);
    setIsAddonDialogOpen(true);
  };

  const openAddSize = (productId: number) => {
    resetSizeForm();
    setSelectedProductId(productId);
    setIsSizeDialogOpen(true);
  };

  const openAddQuantity = (sizeId: number) => {
    resetQuantityForm();
    setSelectedSizeId(sizeId);
    setIsQuantityDialogOpen(true);
  };

  const openAddAddon = (productId: number) => {
    resetAddonForm();
    setSelectedProductId(productId);
    setIsAddonDialogOpen(true);
  };

  // Handle delete with confirmation
  const handleDeleteProduct = (productId: number) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) {
      deleteProductMutation.mutate({ id: productId });
    }
  };

  const handleDeleteSize = (sizeId: number) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הגודל?")) {
      deleteSizeMutation.mutate({ id: sizeId });
    }
  };

  const handleDeleteQuantity = (quantityId: number) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הכמות?")) {
      deleteQuantityMutation.mutate({ id: quantityId });
    }
  };

  const handleDeleteAddon = (addonId: number) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את התוספת?")) {
      deleteAddonMutation.mutate({ id: addonId });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">מוצרים</h1>
          <p className="text-slate-500 text-sm mt-1">ניהול קטלוג המוצרים</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            רענון
          </Button>
          <Button size="sm" onClick={() => {
            resetProductForm();
            setProductForm(prev => ({ ...prev, categoryId: selectedCategoryId }));
            setIsProductDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 ml-2" />
            מוצר חדש
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-slate-200">
        {categories.map((category: Category) => {
          const IconComponent = categoryIcons[category.icon || ''] || Package;
          const isSelected = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategoryId(category.id);
                setExpandedProductId(null);
                setExpandedSizeId(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                isSelected
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <IconComponent className="h-4 w-4" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="חיפוש מוצר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">טוען מוצרים...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">אין מוצרים בקטגוריה זו</p>
            <Button 
              variant="outline"
              className="mt-4"
              onClick={() => {
                resetProductForm();
                setProductForm(prev => ({ ...prev, categoryId: selectedCategoryId }));
                setIsProductDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 ml-2" />
              הוסף מוצר ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product: Product) => {
            const isExpanded = expandedProductId === product.id;
            return (
              <Card key={product.id} className="overflow-hidden">
                {/* Product Header */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isExpanded ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <Package className={`h-5 w-5 ${isExpanded ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-slate-500">{product.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1">
                      <Ruler className="h-3 w-3" />
                      {product.sizes?.length || 0} גדלים
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditProduct(product); }}>
                          <Pencil className="h-4 w-4 ml-2" />
                          עריכת מוצר
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeleteProduct(product.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחק מוצר
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronLeft className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content - Sizes displayed flat */}
                {isExpanded && (
                  <div className="bg-slate-50">
                    {/* Sizes Section */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Ruler className="h-4 w-4" />
                          גדלים
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openAddSize(product.id)} className="gap-1 h-8">
                          <Plus className="h-3 w-3" />
                          גודל חדש
                        </Button>
                      </div>

                      {/* Sizes Grid - Displayed flat */}
                      {!sizesData || sizesData.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4 bg-white rounded-lg border border-dashed">
                          אין גדלים למוצר זה. לחץ על "גודל חדש" להוספה.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sizesData.map((size: any) => {
                            const isSizeExpanded = expandedSizeId === size.id;
                            return (
                              <div key={size.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                {/* Size Row */}
                                <div
                                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                                    isSizeExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'
                                  }`}
                                  onClick={() => toggleSize(size.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="font-medium text-slate-800">{size.name}</div>
                                    {size.dimensions && (
                                      <span className="text-sm text-slate-400">({size.dimensions})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditSize(size, product.id);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSize(size.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                    {isSizeExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-slate-400" />
                                    ) : (
                                      <ChevronLeft className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* Quantities - Expanded under size */}
                                {isSizeExpanded && (
                                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                        <DollarSign className="h-3 w-3" />
                                        כמויות ומחירים
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => openAddQuantity(size.id)} 
                                        className="gap-1 h-6 text-xs px-2"
                                      >
                                        <Plus className="h-3 w-3" />
                                        הוסף
                                      </Button>
                                    </div>
                                    
                                    {!quantitiesData || quantitiesData.length === 0 ? (
                                      <div className="text-center text-slate-400 text-xs py-2">
                                        אין כמויות מוגדרות
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {quantitiesData.map((sq: SizeQuantity) => (
                                          <div
                                            key={sq.id}
                                            className="flex items-center gap-2 bg-white rounded-md px-3 py-2 border border-slate-200 group"
                                          >
                                            <div className="text-sm">
                                              <span className="font-medium text-slate-700">{sq.quantity} יח'</span>
                                              <span className="mx-1 text-slate-300">|</span>
                                              <span className="text-green-600 font-semibold">₪{parseFloat(sq.price).toFixed(0)}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                className="p-1 hover:bg-slate-100 rounded"
                                                onClick={() => openEditQuantity(sq)}
                                              >
                                                <Pencil className="h-3 w-3 text-slate-400" />
                                              </button>
                                              <button
                                                className="p-1 hover:bg-red-50 rounded"
                                                onClick={() => handleDeleteQuantity(sq.id)}
                                              >
                                                <Trash2 className="h-3 w-3 text-red-400" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Addons Section */}
                    <div className="p-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Sparkles className="h-4 w-4" />
                          תוספות
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openAddAddon(product.id)} className="gap-1 h-8">
                          <Plus className="h-3 w-3" />
                          תוספת חדשה
                        </Button>
                      </div>

                      {!addonsData || addonsData.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4 bg-white rounded-lg border border-dashed">
                          אין תוספות למוצר זה
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {addonsData.filter((a: ProductAddon) => a.isActive !== false).map((addon: ProductAddon) => (
                            <div
                              key={addon.id}
                              className="flex items-center gap-2 bg-white rounded-md px-3 py-2 border border-slate-200 group"
                            >
                              <div className="text-sm">
                                <span className="font-medium text-slate-700">{addon.name}</span>
                                <span className="mx-1 text-slate-300">|</span>
                                <span className="text-blue-600 font-semibold">
                                  {addon.priceType === 'percentage' ? `${addon.price}%` : `₪${parseFloat(addon.price).toFixed(0)}`}
                                </span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-1 hover:bg-slate-100 rounded"
                                  onClick={() => openEditAddon(addon, product.id)}
                                >
                                  <Pencil className="h-3 w-3 text-slate-400" />
                                </button>
                                <button
                                  className="p-1 hover:bg-red-50 rounded"
                                  onClick={() => handleDeleteAddon(addon.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Dialog */}
      <ProductDialog
        isOpen={isProductDialogOpen}
        onClose={() => setIsProductDialogOpen(false)}
        onSubmit={handleProductSubmit}
        isEditMode={isEditMode}
        formData={productForm}
        setFormData={setProductForm}
        categories={categories}
      />

      {/* Size Dialog */}
      <SizeDialog
        isOpen={isSizeDialogOpen}
        onClose={() => setIsSizeDialogOpen(false)}
        onSubmit={handleSizeSubmit}
        isEditMode={isEditMode}
        formData={sizeForm}
        setFormData={setSizeForm}
      />

      {/* Quantity Dialog */}
      <QuantityDialog
        isOpen={isQuantityDialogOpen}
        onClose={() => setIsQuantityDialogOpen(false)}
        onSubmit={handleQuantitySubmit}
        isEditMode={isEditMode}
        formData={quantityForm}
        setFormData={setQuantityForm}
      />

      {/* Addon Dialog */}
      <AddonDialog
        isOpen={isAddonDialogOpen}
        onClose={() => setIsAddonDialogOpen(false)}
        onSubmit={handleAddonSubmit}
        isEditMode={isEditMode}
        formData={addonForm}
        setFormData={setAddonForm}
      />
    </div>
  );
}
