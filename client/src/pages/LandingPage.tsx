/**
 * Landing Page
 * Main page for customer quote requests
 * Refactored to use modular components
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, Loader2, LogIn } from "lucide-react";

// Landing page components
import {
  LoginModal,
  CustomerForm,
  ProductSelector,
  ProductList,
  GeneralFileUploader,
  // Types
  type CustomerFormData,
  type SelectedProduct,
  type ProductFile,
  type Category,
  type SelectedAddon,
  // Utils
  getImageDimensions,
  validateFileForProduct,
  uploadFileToS3,
  validateFileBasic,
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
  const totalPrice = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      let price = p.price;
      if (p.needsGraphicDesign) {
        price += p.graphicDesignPrice;
      }
      return sum + price;
    }, 0);
  }, [selectedProducts]);

  const hasUnresolvedErrors = useMemo(() => {
    return selectedProducts.some(
      (p) => p.file?.validationErrors?.length && !p.needsGraphicDesign
    );
  }, [selectedProducts]);

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

  // Reset addons when category changes
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedAddonIds([]); // Reset addons when category changes
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

    // Build selected addons array
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
    
    // Reset selection (keep category for convenience)
    setSelectedQuantityId(null);
    setSelectedAddonIds([]); // Reset addons after adding product
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

    // Basic validation
    const basicValidation = validateFileBasic(file);
    if (!basicValidation.valid) {
      toast.error(basicValidation.error);
      return;
    }

    // Find the product
    const product = selectedProducts.find((p) => p.id === productId);
    if (!product) return;

    // Create file object
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

    // Get image dimensions
    const imageDimensions = await getImageDimensions(file);

    // Validate file against product requirements
    const { errors, warnings } = await validateFileForProduct(
      file,
      imageDimensions,
      product.sizeDimensions,
      product.categoryValidation
    );

    // Update product with file (uploading state)
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

    // Upload to S3
    const uploadResult = await uploadFileToS3(file);

    // Update with upload result
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

    // Reset input
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

    // Validation
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
      // Build notes from warnings and addons
      const notes: string[] = [];
      selectedProducts.forEach((p) => {
        if (p.needsGraphicDesign) {
          notes.push(`${p.productName}: נדרש עיצוב גרפי (₪${p.graphicDesignPrice})`);
        }
        // Add addons to notes
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
        // Quote with products
        await createWithQuoteMutation.mutateAsync({
          customerInfo: {
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            companyName: customerData.company || undefined,
          },
          quoteItems: selectedProducts.map((p) => ({
            sizeQuantityId: p.quantityId, // This is the sizeQuantity ID
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
        // Quote with files only
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
  // Success Screen
  // ============================================================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">הבקשה נשלחה בהצלחה!</h2>
          <p className="text-slate-600 mb-6">נחזור אליך בהקדם עם הצעת מחיר מותאמת</p>
          <Button onClick={() => window.location.reload()} variant="outline">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QF</span>
            </div>
            <span className="font-semibold text-slate-800">QuoteFlow</span>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600"
          >
            <LogIn className="h-4 w-4" />
            התחברות
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">בקשת הצעת מחיר</h1>
          <p className="text-slate-600 text-sm">בחרו מוצר או תארו את הפרויקט שלכם ונחזור אליכם עם הצעה מותאמת</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Form */}
          <CustomerForm data={customerData} onChange={setCustomerData} />

          {/* Product Selector */}
          <ProductSelector
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
            onAddProduct={handleAddProduct}
          />

          {/* Product List */}
          <ProductList
            products={selectedProducts}
            onProductFileUpload={handleProductFileUpload}
            onProductFileRemove={removeProductFile}
            onProductRemove={removeProduct}
            onToggleGraphicDesign={toggleProductGraphicDesign}
          />

          {/* General File Uploader */}
          <GeneralFileUploader
            files={generalFiles}
            description={description}
            hasProducts={selectedProducts.length > 0}
            onFileUpload={handleGeneralFileUpload}
            onFileRemove={removeGeneralFile}
            onDescriptionChange={setDescription}
          />

          {/* Error Messages */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <p className="font-medium text-red-800">{submitError}</p>
              <ul className="mt-1 space-y-0.5">
                {submitErrorDetails.map((detail, index) => (
                  <li key={index} className="text-red-700 flex items-center gap-1 text-xs">
                    <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitLoading || !customerData.name || !customerData.phone || !customerData.email || hasUnresolvedErrors}
            className="w-full h-12 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base"
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
          <p className="text-xs text-slate-400 text-center">
            {hasUnresolvedErrors
              ? "יש לתקן שגיאות בקבצים לפני שליחה"
              : selectedProducts.length > 0
              ? `${selectedProducts.length} מוצרים נבחרו`
              : generalFiles.length > 0
              ? "ניתן לשלוח עם קבצים ותיאור בלבד"
              : "בחרו מוצרים או העלו קבצים"}
          </p>
        </form>
      </main>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
