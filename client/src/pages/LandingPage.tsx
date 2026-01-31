/**
 * Landing Page
 * Main page for customer quote requests
 * Split Screen Design - Minimalist & Professional
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Send, Loader2, LogIn, Package, Upload, X, Check, 
  Trash2, AlertCircle, AlertTriangle, Palette, FileText,
  Image, File, Plus, Tag, ShoppingCart, User, Phone, Mail, Building
} from "lucide-react";

// Landing page components & utils
import {
  LoginModal,
  type CustomerFormData,
  type SelectedProduct,
  type ProductFile,
  type Category,
  type SelectedAddon,
  getImageDimensions,
  validateFileForProduct,
  uploadFileToS3,
  validateFileBasic,
  ALLOWED_EXTENSIONS,
} from "@/components/landing";

export default function LandingPage() {
  // ============================================================================
  // Authentication State
  // ============================================================================
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ============================================================================
  // Customer Form State
  // ============================================================================
  const [customerData, setCustomerData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  // ============================================================================
  // Product Selection State
  // ============================================================================
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  // ============================================================================
  // File Upload State
  // ============================================================================
  const [generalFiles, setGeneralFiles] = useState<ProductFile[]>([]);
  const [description, setDescription] = useState("");

  // ============================================================================
  // Submission State
  // ============================================================================
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // ============================================================================
  // API Queries
  // ============================================================================
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
    { categoryId: selectedCategoryId! },
    { enabled: !!selectedCategoryId }
  );

  // ============================================================================
  // API Mutations
  // ============================================================================
  const createWithQuoteMutation = trpc.customers.createWithQuote.useMutation();
  const createQuoteFilesOnlyMutation = trpc.customers.createQuoteWithFilesOnly.useMutation();

  // ============================================================================
  // Computed Values
  // ============================================================================
  const hasUnresolvedErrors = useMemo(() => {
    return selectedProducts.some(
      (p) => p.file?.validationErrors?.length && !p.needsGraphicDesign
    );
  }, [selectedProducts]);

  const canSubmit = useMemo(() => {
    const hasBasicInfo = customerData.name && customerData.email && customerData.phone;
    const hasContent = selectedProducts.length > 0 || generalFiles.length > 0;
    const hasDescriptionIfNeeded = selectedProducts.length > 0 || description.trim();
    return hasBasicInfo && hasContent && hasDescriptionIfNeeded && !hasUnresolvedErrors;
  }, [customerData, selectedProducts, generalFiles, description, hasUnresolvedErrors]);

  // ============================================================================
  // Addon Management
  // ============================================================================
  const handleAddonToggle = (addonId: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedAddonIds([]);
  };

  // ============================================================================
  // Product Management
  // ============================================================================
  const handleAddProduct = () => {
    if (!selectedQuantityId || !selectedSizeId || !selectedProductId || !selectedCategoryId) return;

    const product = products?.find((p) => p.id === selectedProductId);
    const size = sizes?.find((s) => s.id === selectedSizeId);
    const quantity = quantities?.find((q) => q.id === selectedQuantityId);
    const category = categories?.find((c) => c.id === selectedCategoryId);

    if (!product || !size || !quantity) return;

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

    const newProduct: SelectedProduct = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      productName: product.name,
      categoryId: selectedCategoryId,
      categoryValidation: category as Category,
      sizeId: size.id,
      sizeName: size.name,
      sizeDimensions: size.dimensions,
      quantityId: quantity.id,
      quantity: quantity.quantity,
      price: parseFloat(quantity.price),
      graphicDesignPrice: parseFloat(size.graphicDesignPrice || "0"),
      addons: productAddons.length > 0 ? productAddons : undefined,
    };

    setSelectedProducts((prev) => [...prev, newProduct]);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
    toast.success(`${product.name} נוסף לרשימה`);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ============================================================================
  // Product File Upload
  // ============================================================================
  const handleProductFileUpload = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const basicValidation = validateFileBasic(file);
    if (!basicValidation.valid) {
      toast.error(basicValidation.error);
      return;
    }

    const product = selectedProducts.find((p) => p.id === productId);
    if (!product) return;

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const imageDimensions = await getImageDimensions(file);

    const { errors, warnings } = await validateFileForProduct(
      file,
      imageDimensions,
      product.sizeDimensions,
      product.categoryValidation
    );

    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              file: {
                file,
                id: fileId,
                preview,
                uploading: true,
                imageDimensions,
                validationErrors: errors,
                validationWarnings: warnings,
              },
            }
          : p
      )
    );

    const uploadResult = await uploadFileToS3(file);

    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId && p.file?.id === fileId
          ? {
              ...p,
              file: {
                ...p.file,
                uploading: false,
                uploaded: !!uploadResult,
                s3Key: uploadResult?.key,
                s3Url: uploadResult?.url,
              },
            }
          : p
      )
    );

    if (uploadResult) {
      if (errors.length > 0) {
        toast.warning("הקובץ הועלה אך יש בעיות שדורשות טיפול");
      } else if (warnings.length > 0) {
        toast.success("הקובץ הועלה בהצלחה (עם הערות)");
      } else {
        toast.success("הקובץ הועלה בהצלחה");
      }
    }

    e.target.value = "";
  };

  const removeProductFile = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, file: undefined, needsGraphicDesign: false }
          : p
      )
    );
  };

  const toggleProductGraphicDesign = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, needsGraphicDesign: !p.needsGraphicDesign } : p
      )
    );
  };

  // ============================================================================
  // General File Upload
  // ============================================================================
  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const basicValidation = validateFileBasic(file);
    if (!basicValidation.valid) {
      toast.error(basicValidation.error);
      return;
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

    setGeneralFiles((prev) => [
      ...prev,
      { file, id: fileId, preview, uploading: true },
    ]);

    const uploadResult = await uploadFileToS3(file);

    setGeneralFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              uploading: false,
              uploaded: !!uploadResult,
              s3Key: uploadResult?.key,
              s3Url: uploadResult?.url,
            }
          : f
      )
    );

    if (uploadResult) {
      toast.success("הקובץ הועלה בהצלחה");
    }

    e.target.value = "";
  };

  const removeGeneralFile = (fileId: string) => {
    setGeneralFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ============================================================================
  // Form Submission
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitErrorDetails([]);

    const errors: string[] = [];
    if (!customerData.name) errors.push("שם מלא חסר");
    if (!customerData.email) errors.push("אימייל חסר");
    if (!customerData.phone) errors.push("טלפון חסר");

    if (selectedProducts.length === 0 && generalFiles.length === 0) {
      errors.push("יש לבחור מוצר או להעלות קבצים");
    }

    if (selectedProducts.length === 0 && generalFiles.length > 0 && !description.trim()) {
      errors.push("יש להוסיף תיאור כשמעלים קבצים ללא מוצרים");
    }

    if (hasUnresolvedErrors) {
      errors.push("יש לתקן שגיאות בקבצים או לבחור עיצוב גרפי");
    }

    if (errors.length > 0) {
      setSubmitError("שגיאה בשליחת הבקשה");
      setSubmitErrorDetails(errors);
      return;
    }

    setSubmitLoading(true);

    try {
      const notes: string[] = [];
      selectedProducts.forEach((p) => {
        if (p.needsGraphicDesign) {
          notes.push(`${p.productName}: נדרש עיצוב גרפי (₪${p.graphicDesignPrice})`);
        }
        if (p.addons && p.addons.length > 0) {
          const addonNames = p.addons.map((a) => a.name).join(", ");
          notes.push(`${p.productName} - תוספות: ${addonNames}`);
        }
        p.file?.validationWarnings?.forEach((w) => {
          notes.push(`${p.productName}: ${w.message} - ${w.details || ""}`);
        });
      });
      if (description.trim()) {
        notes.push(`תיאור: ${description}`);
      }

      if (selectedProducts.length > 0) {
        await createWithQuoteMutation.mutateAsync({
          customerInfo: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            companyName: customerData.company || undefined,
          },
          quoteItems: selectedProducts.map((p) => ({
            sizeQuantityId: p.quantityId,
            quantity: p.quantity,
            addonIds: p.addons?.map((a) => a.id),
          })),
          notes: notes.join("\n"),
          attachments: generalFiles
            .filter((f) => f.s3Key)
            .map((f) => ({
              fileName: f.file.name,
              fileUrl: f.s3Url!,
              s3Key: f.s3Key!,
            })),
        });
      } else {
        await createQuoteFilesOnlyMutation.mutateAsync({
          customerInfo: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            companyName: customerData.company || undefined,
          },
          description: description,
          attachments: generalFiles
            .filter((f) => f.s3Key)
            .map((f) => ({
              fileName: f.file.name,
              fileUrl: f.s3Url!,
              s3Key: f.s3Key!,
            })),
        });
      }

      setSubmitted(true);
      toast.success("הבקשה נשלחה בהצלחה!");
    } catch (error: any) {
      console.error("Submit error:", error);
      setSubmitError("שגיאה בשליחת הבקשה");
      setSubmitErrorDetails([error.message || "אנא נסה שוב מאוחר יותר"]);
      toast.error("שגיאה בשליחת הבקשה");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ============================================================================
  // Helper: Get file icon
  // ============================================================================
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // ============================================================================
  // Success Screen
  // ============================================================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">הבקשה נשלחה בהצלחה</h2>
          <p className="text-slate-500 mb-8">נחזור אליך בהקדם עם הצעת מחיר מותאמת</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="px-8"
          >
            שלח בקשה נוספת
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render - Split Screen Layout
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Minimal Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QF</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">QuoteFlow</span>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            התחברות
          </button>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
          
          {/* Right Side - Form (RTL: appears on right) */}
          <div className="flex-1 p-6 lg:p-10 lg:border-l border-slate-200 overflow-y-auto">
            <div className="max-w-xl">
              {/* Page Title */}
              <div className="mb-10">
                <h1 className="text-3xl font-semibold text-slate-900 mb-2">בקשת הצעת מחיר</h1>
                <p className="text-slate-500">מלאו את הפרטים ונחזור אליכם עם הצעה מותאמת</p>
              </div>

              {/* Customer Details Section */}
              <section className="mb-10">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">פרטי לקוח</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      שם מלא <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerData.name}
                        onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                        className="w-full h-11 pr-10 pl-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                        placeholder="הזן שם מלא"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        אימייל <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                          className="w-full h-11 pr-10 pl-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                          placeholder="email@example.com"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        טלפון <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                          className="w-full h-11 pr-10 pl-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                          placeholder="050-0000000"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      חברה <span className="text-slate-400 font-normal">(אופציונלי)</span>
                    </label>
                    <div className="relative">
                      <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerData.company}
                        onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })}
                        className="w-full h-11 pr-10 pl-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                        placeholder="שם החברה"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Product Selection Section */}
              <section className="mb-10">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">בחירת מוצר</h2>
                
                <div className="space-y-4">
                  {/* Category & Product Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">קטגוריה</label>
                      <select
                        value={selectedCategoryId || ""}
                        onChange={(e) => {
                          handleCategoryChange(e.target.value ? parseInt(e.target.value) : null);
                          setSelectedProductId(null);
                          setSelectedSizeId(null);
                          setSelectedQuantityId(null);
                        }}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none cursor-pointer"
                      >
                        <option value="">בחר קטגוריה</option>
                        {categories?.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">מוצר</label>
                      <select
                        value={selectedProductId || ""}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value ? parseInt(e.target.value) : null);
                          setSelectedSizeId(null);
                          setSelectedQuantityId(null);
                        }}
                        disabled={!selectedCategoryId}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">בחר מוצר</option>
                        {products?.map((prod) => (
                          <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Size & Quantity Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">גודל</label>
                      <select
                        value={selectedSizeId || ""}
                        onChange={(e) => {
                          setSelectedSizeId(e.target.value ? parseInt(e.target.value) : null);
                          setSelectedQuantityId(null);
                        }}
                        disabled={!selectedProductId}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">בחר גודל</option>
                        {sizes?.map((size) => (
                          <option key={size.id} value={size.id}>
                            {size.name} {size.dimensions && `(${size.dimensions})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">כמות</label>
                      <select
                        value={selectedQuantityId || ""}
                        onChange={(e) => setSelectedQuantityId(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={!selectedSizeId}
                        className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">בחר כמות</option>
                        {quantities?.map((qty) => (
                          <option key={qty.id} value={qty.id}>{qty.quantity} יח'</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Addons */}
                  {selectedCategoryId && addons && addons.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">תוספות</label>
                      <div className="flex flex-wrap gap-2">
                        {addons.map((addon) => (
                          <label
                            key={addon.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                              selectedAddonIds.includes(addon.id)
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAddonIds.includes(addon.id)}
                              onChange={() => handleAddonToggle(addon.id)}
                              className="sr-only"
                            />
                            {addon.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Product Button */}
                  <Button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedQuantityId}
                    variant="outline"
                    className="w-full h-11 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף מוצר לרשימה
                  </Button>
                </div>
              </section>

              {/* General Files Section */}
              <section className="mb-10">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">קבצים נוספים</h2>
                
                <div className="space-y-4">
                  {/* File Upload Area */}
                  <div>
                    <input
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      onChange={handleGeneralFileUpload}
                      className="hidden"
                      id="general-file-upload"
                    />
                    <label
                      htmlFor="general-file-upload"
                      className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-slate-500">לחץ להעלאת קבצים</span>
                    </label>
                  </div>

                  {/* Uploaded Files */}
                  {generalFiles.length > 0 && (
                    <div className="space-y-2">
                      {generalFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                          {f.preview ? (
                            <img src={f.preview} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                              {getFileIcon(f.file)}
                            </div>
                          )}
                          <span className="flex-1 text-sm text-slate-700 truncate">{f.file.name}</span>
                          {f.uploading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                          {f.uploaded && <Check className="h-4 w-4 text-emerald-500" />}
                          <button
                            type="button"
                            onClick={() => removeGeneralFile(f.id)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {selectedProducts.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        תיאור הפרויקט {generalFiles.length > 0 && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                        placeholder="תאר את הפרויקט שלך..."
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Left Side - Summary (RTL: appears on left) */}
          <div className="w-full lg:w-96 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] overflow-y-auto border-t lg:border-t-0 border-slate-200">
            <div className="p-6 lg:p-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                סיכום הזמנה
              </h2>

              {/* Selected Products */}
              {selectedProducts.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-slate-900">{product.productName}</h3>
                          <p className="text-sm text-slate-500">{product.sizeName} • {product.quantity} יח'</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>

                      {/* Addons */}
                      {product.addons && product.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.addons.map((addon) => (
                            <span
                              key={addon.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs"
                            >
                              <Tag className="h-3 w-3" />
                              {addon.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* File Upload for Product */}
                      {!product.file ? (
                        <div>
                          <input
                            type="file"
                            accept={ALLOWED_EXTENSIONS.join(',')}
                            onChange={(e) => handleProductFileUpload(product.id, e)}
                            className="hidden"
                            id={`file-${product.id}`}
                          />
                          <label
                            htmlFor={`file-${product.id}`}
                            className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-white transition-all text-xs"
                          >
                            <Upload className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-500">העלה קובץ</span>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                            {product.file.preview ? (
                              <img src={product.file.preview} alt="" className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                {getFileIcon(product.file.file)}
                              </div>
                            )}
                            <span className="flex-1 text-xs text-slate-700 truncate">{product.file.file.name}</span>
                            {product.file.uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                            {product.file.uploaded && !product.file.validationErrors?.length && !product.needsGraphicDesign && (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            {product.needsGraphicDesign && <Palette className="h-3.5 w-3.5 text-purple-500" />}
                            {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeProductFile(product.id)}
                              className="p-0.5 hover:bg-slate-100 rounded"
                            >
                              <X className="h-3 w-3 text-slate-400" />
                            </button>
                          </div>

                          {/* Validation Errors */}
                          {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                            <div className="space-y-1">
                              {product.file.validationErrors.map((err, i) => (
                                <p key={i} className="text-red-600 text-xs">
                                  ❌ {err.message}
                                </p>
                              ))}
                              <button
                                type="button"
                                onClick={() => toggleProductGraphicDesign(product.id)}
                                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                              >
                                <Palette className="h-3 w-3" />
                                לחץ כאן לביצוע גרפיקה על ידינו
                              </button>
                            </div>
                          )}

                          {/* Validation Warnings */}
                          {product.file.validationWarnings && product.file.validationWarnings.length > 0 && !product.file.validationErrors?.length && (
                            <div>
                              {product.file.validationWarnings.map((warn, i) => (
                                <p key={i} className="text-amber-600 text-xs flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {warn.message}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Graphic Design Selected */}
                          {product.needsGraphicDesign && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-purple-600 flex items-center gap-1">
                                <Palette className="h-3 w-3" />
                                נבחר עיצוב גרפי
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleProductGraphicDesign(product.id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                ביטול
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">לא נבחרו מוצרים</p>
                </div>
              )}

              {/* General Files in Summary */}
              {generalFiles.length > 0 && (
                <div className="mb-6 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">קבצים מצורפים: {generalFiles.length}</p>
                </div>
              )}

              {/* Error Messages */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="font-medium text-red-800 text-sm mb-1">{submitError}</p>
                  <ul className="space-y-0.5">
                    {submitErrorDetails.map((detail, index) => (
                      <li key={index} className="text-red-600 text-xs">• {detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitLoading || !canSubmit}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-5 w-5" />
                    שלח בקשה
                  </>
                )}
              </Button>

              {/* Help Text */}
              <p className="text-xs text-slate-400 text-center mt-4">
                {hasUnresolvedErrors
                  ? "יש לתקן שגיאות בקבצים"
                  : !canSubmit
                  ? "מלא את כל השדות הנדרשים"
                  : "הבקשה מוכנה לשליחה"}
              </p>
            </div>
          </div>
        </form>
      </main>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
