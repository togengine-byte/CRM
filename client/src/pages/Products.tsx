import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Layers,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Printer,
  Maximize,
  SignpostBig,
  Shirt,
  Flame,
  Ruler
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

interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  price: number | null;
  pricingType: string | null;
  attributes: unknown;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  categoryId: number | null;
  isActive: boolean;
  variantCount: number;
  variants: ProductVariant[];
}

interface ProductFormData {
  name: string;
  description: string;
  categoryId: number | null;
}

interface VariantFormData {
  sku: string;
  name: string;
  price: string;
  pricingType: string;
}

export default function Products() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    description: "",
    categoryId: null,
  });

  const [variantForm, setVariantForm] = useState<VariantFormData>({
    sku: "",
    name: "",
    price: "",
    pricingType: "fixed",
  });

  const utils = trpc.useUtils();

  // Fetch categories
  const { data: categoriesData } = trpc.products.getCategories.useQuery();
  const categories = categoriesData || [];

  // Fetch products
  const { data: products, isLoading, refetch } = trpc.products.list.useQuery({
    categoryId: selectedCategoryId || undefined,
  });

  // Mutations
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("המוצר נוצר בהצלחה");
      refetch();
      setIsProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error) => toast.error(`שגיאה ביצירת המוצר: ${error.message}`),
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("המוצר עודכן בהצלחה");
      refetch();
      setIsProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error) => toast.error(`שגיאה בעדכון המוצר: ${error.message}`),
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("המוצר נמחק בהצלחה");
      refetch();
    },
    onError: (error) => toast.error(`שגיאה במחיקת המוצר: ${error.message}`),
  });

  const createVariantMutation = trpc.products.createVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט נוצר בהצלחה");
      refetch();
      setIsVariantDialogOpen(false);
      resetVariantForm();
    },
    onError: (error) => toast.error(`שגיאה ביצירת הוריאנט: ${error.message}`),
  });

  const updateVariantMutation = trpc.products.updateVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט עודכן בהצלחה");
      refetch();
      setIsVariantDialogOpen(false);
      resetVariantForm();
    },
    onError: (error) => toast.error(`שגיאה בעדכון הוריאנט: ${error.message}`),
  });

  const deleteVariantMutation = trpc.products.deleteVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט נמחק בהצלחה");
      refetch();
    },
    onError: (error) => toast.error(`שגיאה במחיקת הוריאנט: ${error.message}`),
  });

  // Form handlers
  const resetProductForm = () => {
    setProductForm({ name: "", description: "", categoryId: selectedCategoryId });
    setIsEditMode(false);
    setSelectedProductId(null);
  };

  const resetVariantForm = () => {
    setVariantForm({ sku: "", name: "", price: "", pricingType: "fixed" });
    setIsEditMode(false);
    setSelectedVariantId(null);
    setSelectedProductId(null);
  };

  const handleCreateProduct = () => {
    resetProductForm();
    setProductForm(prev => ({ ...prev, categoryId: selectedCategoryId }));
    setIsEditMode(false);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId,
    });
    setSelectedProductId(product.id);
    setIsEditMode(true);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (productId: number) => {
    if (confirm("האם אתה בטוח שברצונך למחוק מוצר זה?")) {
      deleteProductMutation.mutate({ id: productId });
    }
  };

  const handleCreateVariant = (productId: number) => {
    resetVariantForm();
    setSelectedProductId(productId);
    setIsEditMode(false);
    setIsVariantDialogOpen(true);
  };

  const handleEditVariant = (productId: number, variant: ProductVariant) => {
    setVariantForm({
      sku: variant.sku,
      name: variant.name,
      price: variant.price?.toString() || "",
      pricingType: variant.pricingType || "fixed",
    });
    setSelectedProductId(productId);
    setSelectedVariantId(variant.id);
    setIsEditMode(true);
    setIsVariantDialogOpen(true);
  };

  const handleDeleteVariant = (variantId: number) => {
    if (confirm("האם אתה בטוח שברצונך למחוק וריאנט זה?")) {
      deleteVariantMutation.mutate({ id: variantId });
    }
  };

  const handleProductSubmit = () => {
    if (!productForm.name.trim()) {
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

  const handleVariantSubmit = () => {
    if (!variantForm.sku.trim() || !variantForm.name.trim()) {
      toast.error("מק\"ט ושם הוריאנט נדרשים");
      return;
    }

    const price = variantForm.price ? parseFloat(variantForm.price) : undefined;

    if (isEditMode && selectedVariantId) {
      updateVariantMutation.mutate({
        id: selectedVariantId,
        sku: variantForm.sku,
        name: variantForm.name,
        price,
        pricingType: variantForm.pricingType,
      });
    } else if (selectedProductId) {
      createVariantMutation.mutate({
        baseProductId: selectedProductId,
        sku: variantForm.sku,
        name: variantForm.name,
        price,
        pricingType: variantForm.pricingType,
      });
    }
  };

  const toggleProductExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Filter products by search
  const filteredProducts = products?.filter((product: Product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.variants.some(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.sku.toLowerCase().includes(query)
      )
    );
  });

  // Get current category
  const currentCategory = categories.find((c: Category) => c.id === selectedCategoryId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">מוצרים</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ניהול קטלוג המוצרים והוריאנטים
          </p>
        </div>
        <Button onClick={handleCreateProduct} className="gap-2">
          <Plus className="h-4 w-4" />
          מוצר חדש
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategoryId === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategoryId(null)}
          className="shrink-0"
        >
          הכל
          <Badge variant="secondary" className="mr-2 bg-white/20">
            {products?.length || 0}
          </Badge>
        </Button>
        {categories.map((category: Category) => {
          const IconComponent = categoryIcons[category.icon || ''] || Package;
          const categoryProducts = products?.filter((p: Product) => p.categoryId === category.id) || [];
          return (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryId(category.id)}
              className="shrink-0 gap-2"
            >
              <IconComponent className="h-4 w-4" />
              {category.name}
              <Badge variant="secondary" className={selectedCategoryId === category.id ? "bg-white/20" : ""}>
                {categoryProducts.length}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="חיפוש מוצרים, וריאנטים או מק״ט..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  {currentCategory ? currentCategory.name : 'כל המוצרים'}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  {currentCategory?.description || 'קטלוג מוצרים מלא'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filteredProducts && filteredProducts.length > 0 && (
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0">
                  {filteredProducts.length} מוצרים
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Package className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">אין מוצרים</h3>
              <p className="text-sm text-slate-500 mt-1">
                התחל על ידי יצירת מוצר חדש
              </p>
              <Button onClick={handleCreateProduct} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                מוצר חדש
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {filteredProducts?.map((product: Product) => (
                <div
                  key={product.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Product Header */}
                  <div 
                    className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleProductExpand(product.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Package className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{product.name}</span>
                          {!product.isActive && (
                            <Badge variant="destructive" className="text-[10px]">לא פעיל</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {product.description || "ללא תיאור"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1 bg-white">
                        <Layers className="h-3 w-3" />
                        {product.variantCount} וריאנטים
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProduct(product); }}>
                            <Pencil className="ml-2 h-4 w-4" />
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreateVariant(product.id); }}>
                            <Plus className="ml-2 h-4 w-4" />
                            הוסף וריאנט
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                            className="text-red-600"
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            מחיקה
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {expandedProducts.has(product.id) ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Variants Table */}
                  {expandedProducts.has(product.id) && (
                    <div className="p-4 border-t border-slate-200">
                      {product.variants.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                          <p>אין וריאנטים למוצר זה</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-2"
                            onClick={() => handleCreateVariant(product.id)}
                          >
                            <Plus className="h-4 w-4" />
                            הוסף וריאנט
                          </Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-right text-slate-600">מק״ט</TableHead>
                              <TableHead className="text-right text-slate-600">שם</TableHead>
                              <TableHead className="text-right text-slate-600">מחיר</TableHead>
                              <TableHead className="text-right text-slate-600">תמחור</TableHead>
                              <TableHead className="text-right text-slate-600">סטטוס</TableHead>
                              <TableHead className="text-left w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {product.variants.map((variant) => (
                              <TableRow key={variant.id} className="hover:bg-slate-50">
                                <TableCell className="font-mono text-sm text-slate-600">
                                  {variant.sku}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">
                                  {variant.name}
                                </TableCell>
                                <TableCell className="text-slate-900">
                                  {variant.price ? `₪${variant.price}` : '-'}
                                </TableCell>
                                <TableCell>
                                  {variant.pricingType === 'per_sqm' ? (
                                    <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                                      <Ruler className="h-3 w-3" />
                                      למ"ר
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                      קבוע
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {variant.isActive ? (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                      פעיל
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">לא פעיל</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditVariant(product.id, variant)}>
                                        <Pencil className="ml-2 h-4 w-4" />
                                        עריכה
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteVariant(variant.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        מחיקה
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleCreateVariant(product.id)}
                        >
                          <Plus className="h-4 w-4" />
                          הוסף וריאנט
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "עדכן את פרטי המוצר" : "הזן את פרטי המוצר החדש"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם המוצר *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="לדוגמה: כרטיסי ביקור"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">תחום</Label>
              <Select
                value={productForm.categoryId?.toString() || ""}
                onValueChange={(value) => setProductForm({ ...productForm, categoryId: value ? parseInt(value) : null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תחום" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="תיאור קצר של המוצר..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleProductSubmit}
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
            >
              {createProductMutation.isPending || updateProductMutation.isPending
                ? "שומר..."
                : isEditMode ? "עדכון" : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "עריכת וריאנט" : "וריאנט חדש"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "עדכן את פרטי הוריאנט" : "הזן את פרטי הוריאנט החדש"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sku">מק״ט *</Label>
              <Input
                id="sku"
                value={variantForm.sku}
                onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                placeholder="לדוגמה: BC-001-A4"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variantName">שם הוריאנט *</Label>
              <Input
                id="variantName"
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                placeholder="לדוגמה: A4 מבריק 300 גרם"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">מחיר (₪)</Label>
              <Input
                id="price"
                type="number"
                value={variantForm.price}
                onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricingType">סוג תמחור</Label>
              <Select
                value={variantForm.pricingType}
                onValueChange={(value) => setVariantForm({ ...variantForm, pricingType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">מחיר קבוע</SelectItem>
                  <SelectItem value="per_sqm">מחיר למטר רבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleVariantSubmit}
              disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
            >
              {createVariantMutation.isPending || updateVariantMutation.isPending
                ? "שומר..."
                : isEditMode ? "עדכון" : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
