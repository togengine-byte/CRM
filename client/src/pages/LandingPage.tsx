/**
 * Landing Page
 * Main page for customer quote requests
 * Compact Split Screen Design with Colors
 * New flow: Select product -> Upload file -> Animate to summary
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Send, Loader2, LogIn, Package, Upload, X, Check, 
  Trash2, AlertCircle, AlertTriangle, Palette, FileText,
  Image, File, Plus, Tag, ShoppingCart, User, Phone, Mail, Building,
  ChevronDown, ChevronUp, MapPin, Receipt, Hash, UserPlus, Video, FileQuestion
} from "lucide-react";

// Landing page components & utils
import {
  LoginModal,
  ProductSelectionRow,
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

// Success sound for animations
const playSuccessSound = () => {
  const audio = new Audio('/success-sound.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [showExpandedDetails, setShowExpandedDetails] = useState(false);

  // ============================================================================
  // Animation State
  // ============================================================================
  const [animatingProductId, setAnimatingProductId] = useState<string | null>(null);

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
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
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
  // Helper Functions
  // ============================================================================
  const getCategoryValidation = useCallback((categoryId: number): Category | undefined => {
    return categories?.find((c) => c.id === categoryId) as Category | undefined;
  }, [categories]);

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
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
  };

  // ============================================================================
  // Product Management (New Flow)
  // ============================================================================
  const handleProductAdded = (product: SelectedProduct) => {
    setAnimatingProductId(product.id);
    setSelectedProducts((prev) => [...prev, product]);
    setSelectedQuantityId(null);
    setSelectedAddonIds([]);
    
    // Clear animation after delay
    setTimeout(() => {
      setAnimatingProductId(null);
    }, 600);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ============================================================================
  // Product File Management (for products in summary)
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
      playSuccessSound();
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
  // General File Upload with Drag & Drop
  // ============================================================================
  const processFile = async (file: File) => {
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
  };

  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      await processFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
  }, []);

  const removeGeneralFile = (fileId: string) => {
    setGeneralFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ============================================================================
  // File Icon Helper
  // ============================================================================
  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
    if (file.type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
    if (file.type.startsWith("video/")) return <Video className="h-4 w-4 text-purple-500" />;
    return <File className="h-4 w-4 text-slate-400" />;
  };

  // ============================================================================
  // Form Submission
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitErrorDetails([]);

    try {
      if (selectedProducts.length > 0) {
        const items = selectedProducts.map((p) => ({
          productId: p.productId,
          sizeId: p.sizeId,
          quantityId: p.quantityId,
          notes: p.needsGraphicDesign
            ? "נדרש עיצוב גרפי"
            : p.file?.validationWarnings?.map((w) => w.message).join(", ") || "",
          fileKey: p.file?.s3Key,
          fileUrl: p.file?.s3Url,
          needsGraphicDesign: p.needsGraphicDesign || false,
          addonIds: p.addons?.map(a => a.id) || [],
        }));

        const generalFileUrls = generalFiles
          .filter((f) => f.s3Url)
          .map((f) => f.s3Url!);

        await createWithQuoteMutation.mutateAsync({
          customerInfo: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            company: customerData.company || undefined,
            address: customerData.address || undefined,
            billingEmail: customerData.billingEmail || undefined,
            taxId: customerData.taxId || undefined,
            contactPerson: customerData.contactPerson || undefined,
          },
          items,
          generalFileUrls,
          notes: description || undefined,
        });
      } else {
        const fileUrls = generalFiles.filter((f) => f.s3Url).map((f) => f.s3Url!);
        await createQuoteFilesOnlyMutation.mutateAsync({
          customerInfo: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            company: customerData.company || undefined,
            address: customerData.address || undefined,
            billingEmail: customerData.billingEmail || undefined,
            taxId: customerData.taxId || undefined,
            contactPerson: customerData.contactPerson || undefined,
          },
          fileUrls,
          description,
        });
      }

      setSubmitted(true);
      toast.success("הבקשה נשלחה בהצלחה!");
    } catch (error: any) {
      setSubmitError("שגיאה בשליחת הבקשה");
      setSubmitErrorDetails([error.message || "נסה שוב מאוחר יותר"]);
      toast.error("שגיאה בשליחת הבקשה");
    }

    setSubmitLoading(false);
  };

  // ============================================================================
  // Success Screen
  // ============================================================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">הבקשה נשלחה בהצלחה!</h1>
          <p className="text-slate-500 mb-6">נחזור אליך בהקדם עם הצעת מחיר</p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setSelectedProducts([]);
              setGeneralFiles([]);
              setDescription("");
              setCustomerData({ name: "", email: "", phone: "", company: "" });
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            שלח בקשה נוספת
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">QuoteFlow</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLoginModal(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <LogIn className="h-4 w-4 ml-1" />
            כניסה
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row min-h-[calc(100vh-60px)]">
          
          {/* Right Side - Form */}
          <div className="flex-1 p-4 lg:p-6 lg:border-l border-slate-200/50 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-5">
              
              {/* Title - Compact */}
              <div className="text-center lg:text-right">
                <h1 className="text-2xl font-bold text-slate-900">בקשת הצעת מחיר</h1>
                <p className="text-slate-500 text-sm">בחרו מוצר, העלו קובץ ונחזור אליכם עם הצעה</p>
              </div>

              {/* Product Selection Row - New Component */}
              <ProductSelectionRow
                categories={categories}
                products={products}
                sizes={sizes}
                quantities={quantities}
                addons={addons}
                selectedCategoryId={selectedCategoryId}
                selectedProductId={selectedProductId}
                selectedSizeId={selectedSizeId}
                selectedQuantityId={selectedQuantityId}
                selectedAddonIds={selectedAddonIds}
                onCategoryChange={handleCategoryChange}
                onProductChange={setSelectedProductId}
                onSizeChange={setSelectedSizeId}
                onQuantityChange={setSelectedQuantityId}
                onAddonToggle={handleAddonToggle}
                onProductAdded={handleProductAdded}
                getCategoryValidation={getCategoryValidation}
              />

              {/* General File Upload - Video/Reference Files */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50">
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-600" />
                  וידאו או קבצים להבנת ההצעה
                  <span className="text-xs font-normal text-slate-400">(אופציונלי)</span>
                </h2>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    isDragging
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    accept={[...ALLOWED_EXTENSIONS, '.mp4', '.mov', '.avi', '.webm'].join(',')}
                    onChange={handleGeneralFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                  />
                  <FileQuestion className={`h-8 w-8 mx-auto mb-2 ${isDragging ? "text-purple-500" : "text-slate-300"}`} />
                  <p className="text-sm text-slate-500">
                    {isDragging ? "שחרר כאן" : "גרור וידאו, לוגו או קבצי עזר"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">קבצים אלו יעזרו לנו להבין את הבקשה</p>
                </div>

                {/* Uploaded Files */}
                {generalFiles.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-24 overflow-y-auto">
                    {generalFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        {f.preview ? (
                          <img src={f.preview} alt="" className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                            {getFileIcon(f.file)}
                          </div>
                        )}
                        <span className="flex-1 text-xs text-slate-700 truncate">{f.file.name}</span>
                        {f.uploading && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
                        {f.uploaded && <Check className="h-4 w-4 text-emerald-500" />}
                        <button type="button" onClick={() => removeGeneralFile(f.id)} className="p-1 hover:bg-slate-200 rounded">
                          <X className="h-3 w-3 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {selectedProducts.length === 0 && (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full mt-3 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="תאר את הפרויקט שלך..."
                  />
                )}
              </div>

              {/* Customer Details - At the End */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    פרטי התקשרות
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowExpandedDetails(!showExpandedDetails)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                  >
                    {showExpandedDetails ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        צמצם פרטים
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        הרחב פרטים
                      </>
                    )}
                  </button>
                </div>
                
                {/* Required Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="שם מלא *"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="טלפון *"
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="אימייל *"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Expanded Optional Fields */}
                {showExpandedDetails && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="relative">
                        <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={customerData.company || ""}
                          onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })}
                          className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="שם חברה"
                        />
                      </div>
                      <div className="relative">
                        <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={customerData.taxId || ""}
                          onChange={(e) => setCustomerData({ ...customerData, taxId: e.target.value })}
                          className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ח.פ / עוסק מורשה"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={customerData.address || ""}
                        onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                        className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="כתובת"
                      />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="relative">
                        <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={customerData.billingEmail || ""}
                          onChange={(e) => setCustomerData({ ...customerData, billingEmail: e.target.value })}
                          className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="מייל לחשבוניות"
                          dir="ltr"
                        />
                      </div>
                      <div className="relative">
                        <UserPlus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={customerData.contactPerson || ""}
                          onChange={(e) => setCustomerData({ ...customerData, contactPerson: e.target.value })}
                          className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="איש קשר נוסף"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Left Side - Summary (Sticky) */}
          <div className="w-full lg:w-80 bg-white/80 backdrop-blur-sm lg:h-full overflow-y-auto border-t lg:border-t-0 border-slate-200/50">
            <div className="p-4 lg:p-5">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                סיכום הזמנה
              </h2>

              {/* Selected Products */}
              {selectedProducts.length > 0 ? (
                <div className="space-y-3 mb-4 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className={`p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-100 transition-all duration-500 ${
                        animatingProductId === product.id 
                          ? "animate-pulse ring-2 ring-blue-400 ring-offset-2" 
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{product.productName}</h3>
                          <p className="text-xs text-slate-500">{product.sizeName} • {product.quantity} יח'</p>
                        </div>
                        <button type="button" onClick={() => removeProduct(product.id)} className="p-1 hover:bg-white rounded">
                          <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>

                      {/* Addons */}
                      {product.addons && product.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.addons.map((addon) => (
                            <span key={addon.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              <Tag className="h-2.5 w-2.5" />
                              {addon.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* File Status */}
                      {product.file ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                            {product.file.preview ? (
                              <img src={product.file.preview} alt="" className="w-7 h-7 object-cover rounded" />
                            ) : (
                              <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center">
                                {getFileIcon(product.file.file)}
                              </div>
                            )}
                            <span className="flex-1 text-xs text-slate-700 truncate">{product.file.file.name}</span>
                            {product.file.uploading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                            {product.file.uploaded && !product.file.validationErrors?.length && !product.needsGraphicDesign && (
                              <Check className="h-3 w-3 text-emerald-500" />
                            )}
                            {product.needsGraphicDesign && <Palette className="h-3 w-3 text-purple-500" />}
                            {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            )}
                            <button type="button" onClick={() => removeProductFile(product.id)} className="p-0.5 hover:bg-slate-100 rounded">
                              <X className="h-3 w-3 text-slate-400" />
                            </button>
                          </div>

                          {/* Validation Errors */}
                          {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                            <div className="space-y-1">
                              {product.file.validationErrors.map((err, i) => (
                                <p key={i} className="text-red-600 text-xs">❌ {err.message}</p>
                              ))}
                              <button
                                type="button"
                                onClick={() => toggleProductGraphicDesign(product.id)}
                                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
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
                        </div>
                      ) : product.needsGraphicDesign ? (
                        <div className="flex items-center justify-between text-xs p-2 bg-purple-50 rounded-lg">
                          <span className="text-purple-600 flex items-center gap-1 font-medium">
                            <Palette className="h-3 w-3" />
                            נדרש עיצוב גרפי
                          </span>
                          <button type="button" onClick={() => toggleProductGraphicDesign(product.id)} className="text-slate-400 hover:text-red-500">
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-white transition-all text-xs">
                          <input
                            type="file"
                            accept={ALLOWED_EXTENSIONS.join(',')}
                            onChange={(e) => handleProductFileUpload(product.id, e)}
                            className="hidden"
                          />
                          <Upload className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-500">העלה קובץ</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">בחר מוצר והעלה קובץ</p>
                  <p className="text-xs mt-1">המוצרים יופיעו כאן</p>
                </div>
              )}

              {/* General Files Count */}
              {generalFiles.length > 0 && (
                <div className="mb-4 py-2 px-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700 font-medium">📎 {generalFiles.length} קבצי עזר מצורפים</p>
                </div>
              )}

              {/* Error Messages */}
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
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
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
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
              <p className="text-xs text-slate-400 text-center mt-3">
                {hasUnresolvedErrors
                  ? "יש לתקן שגיאות בקבצים"
                  : !canSubmit
                  ? "בחר מוצר והעלה קובץ או מלא פרטים"
                  : "✓ הבקשה מוכנה לשליחה"}
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
