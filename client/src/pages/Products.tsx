import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronUp,
  Printer,
  Maximize,
  SignpostBig,
  Shirt,
  Flame,
  Ruler,
  Hash,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

// Icon mapping for categories
const categoryIcons: Record<string, any> = {
  'Printer': Printer,
  'Maximize': Maximize,
  'SignpostBig': SignpostBig,
  'Shirt': Shirt,
  'Flame': Flame,
};

interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
}

interface ProductSize {
  id: number;
  productId: number;
  name: string;
  dimensions: string | null;
  basePrice: string;
  displayOrder: number;
  isActive: boolean;
}

interface ProductQuantity {
  id: number;
  productId: number;
  quantity: number;
  priceMultiplier: string;
  displayOrder: number;
  isActive: boolean;
}

interface ProductAddon {
  id: number;
  productId: number | null;
  categoryId: number | null;
  name: string;
  description: string | null;
  priceType: string;
  price: string;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  imageUrl: string | null;
  allowCustomQuantity: boolean;
  isActive: boolean;
  sizes: ProductSize[];
  quantities: ProductQuantity[];
  addons: ProductAddon[];
}

export default function Products() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [initialCategorySet, setInitialCategorySet] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isAddonDialogOpen, setIsAddonDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    categoryId: null as number | null,
    allowCustomQuantity: true,
  });

  const [sizeForm, setSizeForm] = useState({
    name: "",
    dimensions: "",
    basePrice: "",
  });

  const [quantityForm, setQuantityForm] = useState({
    quantity: "",
    priceMultiplier: "1.0",
  });

  const [addonForm, setAddonForm] = useState({
    name: "",
    description: "",
    priceType: "fixed" as "fixed" | "percentage" | "per_unit",
    price: "",
  });

  const utils = trpc.useUtils();

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
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSizeMutation = trpc.products.updateSize.useMutation({
    onSuccess: () => {
      toast.success("הגודל עודכן בהצלחה");
      setIsSizeDialogOpen(false);
      resetSizeForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSizeMutation = trpc.products.deleteSize.useMutation({
    onSuccess: () => {
      toast.success("הגודל נמחק בהצלחה");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Quantity mutations
  const createQuantityMutation = trpc.products.createQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות נוספה בהצלחה");
      setIsQuantityDialogOpen(false);
      resetQuantityForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateQuantityMutation = trpc.products.updateQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות עודכנה בהצלחה");
      setIsQuantityDialogOpen(false);
      resetQuantityForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteQuantityMutation = trpc.products.deleteQuantity.useMutation({
    onSuccess: () => {
      toast.success("הכמות נמחקה בהצלחה");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Addon mutations
  const createAddonMutation = trpc.products.createAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת נוספה בהצלחה");
      setIsAddonDialogOpen(false);
      resetAddonForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAddonMutation = trpc.products.updateAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת עודכנה בהצלחה");
      setIsAddonDialogOpen(false);
      resetAddonForm();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAddonMutation = trpc.products.deleteAddon.useMutation({
    onSuccess: () => {
      toast.success("התוספת נמחקה בהצלחה");
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
    setSizeForm({ name: "", dimensions: "", basePrice: "" });
    setIsEditMode(false);
    setSelectedItemId(null);
  };

  const resetQuantityForm = () => {
    setQuantityForm({ quantity: "", priceMultiplier: "1.0" });
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
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
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
    if (!sizeForm.name || !sizeForm.basePrice) {
      toast.error("שם ומחיר בסיס נדרשים");
      return;
    }

    if (isEditMode && selectedItemId) {
      updateSizeMutation.mutate({
        id: selectedItemId,
        name: sizeForm.name,
        dimensions: sizeForm.dimensions || undefined,
        basePrice: parseFloat(sizeForm.basePrice),
      });
    } else if (selectedProductId) {
      createSizeMutation.mutate({
        productId: selectedProductId,
        name: sizeForm.name,
        dimensions: sizeForm.dimensions || undefined,
        basePrice: parseFloat(sizeForm.basePrice),
      });
    }
  };

  // Handle quantity submit
  const handleQuantitySubmit = () => {
    if (!quantityForm.quantity || !quantityForm.priceMultiplier) {
      toast.error("כמות ומכפיל מחיר נדרשים");
      return;
    }

    if (isEditMode && selectedItemId) {
      updateQuantityMutation.mutate({
        id: selectedItemId,
        quantity: parseInt(quantityForm.quantity),
        priceMultiplier: parseFloat(quantityForm.priceMultiplier),
      });
    } else if (selectedProductId) {
      createQuantityMutation.mutate({
        productId: selectedProductId,
        quantity: parseInt(quantityForm.quantity),
        priceMultiplier: parseFloat(quantityForm.priceMultiplier),
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
      basePrice: size.basePrice,
    });
    setSelectedProductId(productId);
    setSelectedItemId(size.id);
    setIsEditMode(true);
    setIsSizeDialogOpen(true);
  };

  const openEditQuantity = (quantity: ProductQuantity, productId: number) => {
    setQuantityForm({
      quantity: quantity.quantity.toString(),
      priceMultiplier: quantity.priceMultiplier,
    });
    setSelectedProductId(productId);
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

  const openAddQuantity = (productId: number) => {
    resetQuantityForm();
    setSelectedProductId(productId);
    setIsQuantityDialogOpen(true);
  };

  const openAddAddon = (productId: number) => {
    resetAddonForm();
    setSelectedProductId(productId);
    setIsAddonDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">מוצרים</h1>
          <p className="text-slate-500 text-sm mt-1">ניהול קטלוג המוצרים, גדלים, כמויות ותוספות</p>
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
              onClick={() => setSelectedCategoryId(category.id)}
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
          placeholder="חיפוש מוצר, גודל או תוספת..."
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
            const isExpanded = expandedProducts.has(product.id);
            return (
              <Card key={product.id} className="overflow-hidden">
                {/* Product Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleProduct(product.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{product.name}</h3>
                      <p className="text-sm text-slate-500">{product.description || "ללא תיאור"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Ruler className="h-3 w-3" />
                        {product.sizes?.length || 0} גדלים
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {product.quantities?.length || 0} כמויות
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {product.addons?.length || 0} תוספות
                      </Badge>
                    </div>
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddSize(product.id); }}>
                          <Ruler className="h-4 w-4 ml-2" />
                          הוסף גודל
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddQuantity(product.id); }}>
                          <Hash className="h-4 w-4 ml-2" />
                          הוסף כמות
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddAddon(product.id); }}>
                          <Sparkles className="h-4 w-4 ml-2" />
                          הוסף תוספת
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (confirm("האם למחוק את המוצר?")) {
                              deleteProductMutation.mutate({ id: product.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחק מוצר
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t bg-slate-50 p-4">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Sizes */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <Ruler className="h-4 w-4" />
                            גדלים
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => openAddSize(product.id)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {product.sizes?.length > 0 ? (
                          <div className="space-y-2">
                            {product.sizes.map((size) => (
                              <div key={size.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <div>
                                  <span className="font-medium text-sm">{size.name}</span>
                                  {size.dimensions && (
                                    <span className="text-xs text-slate-500 mr-2">({size.dimensions})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-green-600">₪{size.basePrice}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSize(size, product.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => deleteSizeMutation.mutate({ id: size.id })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">אין גדלים</p>
                        )}
                      </div>

                      {/* Quantities */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            כמויות
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => openAddQuantity(product.id)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {product.quantities?.length > 0 ? (
                          <div className="space-y-2">
                            {product.quantities.map((qty) => (
                              <div key={qty.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <span className="font-medium text-sm">{qty.quantity} יח'</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-500">×{qty.priceMultiplier}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditQuantity(qty, product.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => deleteQuantityMutation.mutate({ id: qty.id })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">אין כמויות</p>
                        )}
                      </div>

                      {/* Addons */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-700 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            תוספות
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => openAddAddon(product.id)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {product.addons?.length > 0 ? (
                          <div className="space-y-2">
                            {product.addons.map((addon) => (
                              <div key={addon.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                <span className="font-medium text-sm">{addon.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-500">
                                    {addon.priceType === 'fixed' && `+₪${addon.price}`}
                                    {addon.priceType === 'percentage' && `+${addon.price}%`}
                                    {addon.priceType === 'per_unit' && `₪${addon.price}/יח'`}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAddon(addon, product.id)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => deleteAddonMutation.mutate({ id: addon.id })}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">אין תוספות</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "עדכן את פרטי המוצר" : "הוסף מוצר חדש לקטלוג"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם המוצר *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="לדוגמה: כרטיסי ביקור"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="תיאור קצר של המוצר"
              />
            </div>
            <div>
              <Label>תחום</Label>
              <Select
                value={productForm.categoryId?.toString() || ""}
                onValueChange={(value) => setProductForm({ ...productForm, categoryId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תחום" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: Category) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleProductSubmit}>
              {isEditMode ? "עדכן" : "צור מוצר"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Size Dialog */}
      <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת גודל" : "גודל חדש"}</DialogTitle>
            <DialogDescription>
              הגדר גודל עם מחיר בסיס
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הגודל *</Label>
              <Input
                value={sizeForm.name}
                onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value })}
                placeholder="לדוגמה: 9x5 ס״מ"
              />
            </div>
            <div>
              <Label>מידות (אופציונלי)</Label>
              <Input
                value={sizeForm.dimensions}
                onChange={(e) => setSizeForm({ ...sizeForm, dimensions: e.target.value })}
                placeholder="לדוגמה: 90x50 מ״מ"
              />
            </div>
            <div>
              <Label>מחיר בסיס (₪) *</Label>
              <Input
                type="number"
                value={sizeForm.basePrice}
                onChange={(e) => setSizeForm({ ...sizeForm, basePrice: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSizeDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSizeSubmit}>
              {isEditMode ? "עדכן" : "הוסף גודל"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Dialog */}
      <Dialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת כמות" : "כמות חדשה"}</DialogTitle>
            <DialogDescription>
              הגדר כמות עם מכפיל מחיר
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כמות (יחידות) *</Label>
              <Input
                type="number"
                value={quantityForm.quantity}
                onChange={(e) => setQuantityForm({ ...quantityForm, quantity: e.target.value })}
                placeholder="לדוגמה: 100"
              />
            </div>
            <div>
              <Label>מכפיל מחיר *</Label>
              <Input
                type="number"
                step="0.1"
                value={quantityForm.priceMultiplier}
                onChange={(e) => setQuantityForm({ ...quantityForm, priceMultiplier: e.target.value })}
                placeholder="1.0"
              />
              <p className="text-xs text-slate-500 mt-1">
                מחיר סופי = מחיר בסיס × מכפיל (לדוגמה: 1.8 = 80% תוספת)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuantityDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleQuantitySubmit}>
              {isEditMode ? "עדכן" : "הוסף כמות"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addon Dialog */}
      <Dialog open={isAddonDialogOpen} onOpenChange={setIsAddonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת תוספת" : "תוספת חדשה"}</DialogTitle>
            <DialogDescription>
              הגדר תוספת אופציונלית למוצר
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם התוספת *</Label>
              <Input
                value={addonForm.name}
                onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                placeholder="לדוגמה: למינציה"
              />
            </div>
            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Textarea
                value={addonForm.description}
                onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })}
                placeholder="תיאור קצר של התוספת"
              />
            </div>
            <div>
              <Label>סוג תמחור *</Label>
              <Select
                value={addonForm.priceType}
                onValueChange={(value: "fixed" | "percentage" | "per_unit") => 
                  setAddonForm({ ...addonForm, priceType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">מחיר קבוע (₪)</SelectItem>
                  <SelectItem value="percentage">אחוז מהמחיר (%)</SelectItem>
                  <SelectItem value="per_unit">מחיר ליחידה (₪/יח')</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {addonForm.priceType === 'fixed' && 'מחיר (₪) *'}
                {addonForm.priceType === 'percentage' && 'אחוז (%) *'}
                {addonForm.priceType === 'per_unit' && 'מחיר ליחידה (₪) *'}
              </Label>
              <Input
                type="number"
                step={addonForm.priceType === 'percentage' ? '1' : '0.01'}
                value={addonForm.price}
                onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddonDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddonSubmit}>
              {isEditMode ? "עדכן" : "הוסף תוספת"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
