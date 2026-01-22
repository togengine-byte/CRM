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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Layers,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";

interface ProductFormData {
  name: string;
  description: string;
  category: string;
}

interface VariantFormData {
  sku: string;
  name: string;
  attributes: string;
}

export default function Products() {
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    description: "",
    category: "",
  });

  const [variantForm, setVariantForm] = useState<VariantFormData>({
    sku: "",
    name: "",
    attributes: "",
  });

  const utils = trpc.useUtils();

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery({
    category: categoryFilter || undefined,
  });

  const { data: categories } = trpc.products.categories.useQuery();

  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("המוצר נוצר בהצלחה");
      utils.products.list.invalidate();
      setIsProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת המוצר: ${error.message}`);
    },
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("המוצר עודכן בהצלחה");
      utils.products.list.invalidate();
      setIsProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון המוצר: ${error.message}`);
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("המוצר נמחק בהצלחה");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת המוצר: ${error.message}`);
    },
  });

  const createVariantMutation = trpc.products.createVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט נוצר בהצלחה");
      utils.products.list.invalidate();
      setIsVariantDialogOpen(false);
      resetVariantForm();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת הוריאנט: ${error.message}`);
    },
  });

  const updateVariantMutation = trpc.products.updateVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט עודכן בהצלחה");
      utils.products.list.invalidate();
      setIsVariantDialogOpen(false);
      resetVariantForm();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הוריאנט: ${error.message}`);
    },
  });

  const deleteVariantMutation = trpc.products.deleteVariant.useMutation({
    onSuccess: () => {
      toast.success("הוריאנט נמחק בהצלחה");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה במחיקת הוריאנט: ${error.message}`);
    },
  });

  const resetProductForm = () => {
    setProductForm({ name: "", description: "", category: "" });
    setIsEditMode(false);
    setSelectedProductId(null);
  };

  const resetVariantForm = () => {
    setVariantForm({ sku: "", name: "", attributes: "" });
    setIsEditMode(false);
    setSelectedVariantId(null);
    setSelectedProductId(null);
  };

  const handleCreateProduct = () => {
    resetProductForm();
    setIsEditMode(false);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: NonNullable<typeof products>[0]) => {
    setProductForm({
      name: product.name,
      description: product.description || "",
      category: product.category || "",
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

  const handleEditVariant = (productId: number, variant: { id: number; sku: string; name: string; attributes: unknown }) => {
    setVariantForm({
      sku: variant.sku,
      name: variant.name,
      attributes: variant.attributes ? JSON.stringify(variant.attributes, null, 2) : "",
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
        category: productForm.category || undefined,
      });
    } else {
      createProductMutation.mutate({
        name: productForm.name,
        description: productForm.description || undefined,
        category: productForm.category || undefined,
      });
    }
  };

  const handleVariantSubmit = () => {
    if (!variantForm.sku.trim() || !variantForm.name.trim()) {
      toast.error("מק\"ט ושם הוריאנט נדרשים");
      return;
    }

    let attributes: Record<string, unknown> | undefined;
    if (variantForm.attributes.trim()) {
      try {
        attributes = JSON.parse(variantForm.attributes);
      } catch {
        toast.error("פורמט JSON לא תקין עבור מאפיינים");
        return;
      }
    }

    if (isEditMode && selectedVariantId) {
      updateVariantMutation.mutate({
        id: selectedVariantId,
        sku: variantForm.sku,
        name: variantForm.name,
        attributes,
      });
    } else if (selectedProductId) {
      createVariantMutation.mutate({
        baseProductId: selectedProductId,
        sku: variantForm.sku,
        name: variantForm.name,
        attributes,
      });
    }
  };

  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.variants.some(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.sku.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">מוצרים</h1>
          <p className="text-muted-foreground">
            ניהול קטלוג המוצרים והוריאנטים
          </p>
        </div>
        <Button onClick={handleCreateProduct} className="gap-2">
          <Plus className="h-4 w-4" />
          מוצר חדש
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="חיפוש מוצרים, וריאנטים או מק״ט..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {categoryFilter || "כל הקטגוריות"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                  כל הקטגוריות
                </DropdownMenuItem>
                {categories?.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            קטלוג מוצרים
            {filteredProducts && (
              <Badge variant="secondary" className="mr-2">
                {filteredProducts.length} מוצרים
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין מוצרים</h3>
              <p className="text-muted-foreground mt-1">
                התחל על ידי יצירת מוצר חדש
              </p>
              <Button onClick={handleCreateProduct} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                מוצר חדש
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredProducts?.map((product) => (
                <AccordionItem
                  key={product.id}
                  value={`product-${product.id}`}
                  className="border rounded-lg px-4"
                >
                  <div className="flex items-center py-4">
                    <AccordionTrigger className="hover:no-underline flex-1">
                      <div className="flex items-center gap-4 flex-1 text-right">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.category && (
                              <Badge variant="outline">{product.category}</Badge>
                            )}
                            {!product.isActive && (
                              <Badge variant="destructive">לא פעיל</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.description || "ללא תיאור"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Layers className="h-3 w-3" />
                          {product.variantCount} וריאנטים
                        </Badge>
                      </div>
                    </AccordionTrigger>
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
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                        >
                          <Pencil className="ml-2 h-4 w-4" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateVariant(product.id);
                          }}
                        >
                          <Plus className="ml-2 h-4 w-4" />
                          הוסף וריאנט
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <AccordionContent>
                    <div className="pt-2 pb-4">
                      {product.variants.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
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
                            <TableRow>
                              <TableHead className="text-right">מק״ט</TableHead>
                              <TableHead className="text-right">שם</TableHead>
                              <TableHead className="text-right">מאפיינים</TableHead>
                              <TableHead className="text-right">סטטוס</TableHead>
                              <TableHead className="text-left w-[100px]">פעולות</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {product.variants.map((variant) => (
                              <TableRow key={variant.id}>
                                <TableCell className="font-mono text-sm">
                                  {variant.sku}
                                </TableCell>
                                <TableCell>{variant.name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {variant.attributes
                                    ? Object.entries(variant.attributes as Record<string, unknown>)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(", ")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {variant.isActive ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleEditVariant(product.id, variant)
                                        }
                                      >
                                        <Pencil className="ml-2 h-4 w-4" />
                                        עריכה
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeleteVariant(variant.id)
                                        }
                                        className="text-destructive focus:text-destructive"
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "עריכת מוצר" : "מוצר חדש"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "עדכן את פרטי המוצר"
                : "הזן את פרטי המוצר החדש"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם המוצר *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="לדוגמה: כרטיסי ביקור"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">קטגוריה</Label>
              <Input
                id="category"
                value={productForm.category}
                onChange={(e) =>
                  setProductForm({ ...productForm, category: e.target.value })
                }
                placeholder="לדוגמה: דפוס דיגיטלי"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({ ...productForm, description: e.target.value })
                }
                placeholder="תיאור קצר של המוצר..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProductDialogOpen(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleProductSubmit}
              disabled={
                createProductMutation.isPending || updateProductMutation.isPending
              }
            >
              {createProductMutation.isPending || updateProductMutation.isPending
                ? "שומר..."
                : isEditMode
                ? "עדכון"
                : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "עריכת וריאנט" : "וריאנט חדש"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "עדכן את פרטי הוריאנט"
                : "הזן את פרטי הוריאנט החדש"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sku">מק״ט *</Label>
              <Input
                id="sku"
                value={variantForm.sku}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, sku: e.target.value })
                }
                placeholder="לדוגמה: BC-001-A4"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variantName">שם הוריאנט *</Label>
              <Input
                id="variantName"
                value={variantForm.name}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, name: e.target.value })
                }
                placeholder="לדוגמה: A4 מבריק 300 גרם"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attributes">מאפיינים (JSON)</Label>
              <Textarea
                id="attributes"
                value={variantForm.attributes}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, attributes: e.target.value })
                }
                placeholder='{"size": "A4", "weight": "300gsm"}'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                פורמט JSON לדוגמה: {`{"מידה": "A4", "משקל": "300 גרם"}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVariantDialogOpen(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleVariantSubmit}
              disabled={
                createVariantMutation.isPending || updateVariantMutation.isPending
              }
            >
              {createVariantMutation.isPending || updateVariantMutation.isPending
                ? "שומר..."
                : isEditMode
                ? "עדכון"
                : "יצירה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
