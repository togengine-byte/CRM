import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  CheckCircle,
  LogIn,
  Upload,
  X,
  File,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Building2,
  Printer,
  Maximize,
  SignpostBig,
  Shirt,
  Flame,
  Package,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// Allowed file types for security
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  error?: string;
}

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
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
}

interface ProductSize {
  id: number;
  name: string;
  dimensions: string | null;
}

interface SizeQuantity {
  id: number;
  sizeId: number;
  quantity: number;
  price: string;
}

interface ProductAddon {
  id: number;
  name: string;
  price: string;
  priceType: string;
}

type Step = 'category' | 'product' | 'size' | 'quantity' | 'addons' | 'details' | 'success';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuthContext();
  
  // Step state
  const [step, setStep] = useState<Step>('category');
  
  // Selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [notes, setNotes] = useState("");
  
  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  // Loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Fetch categories
  const { data: categories } = trpc.products.getCategories.useQuery();
  
  // Fetch products for selected category
  const { data: products } = trpc.products.list.useQuery(
    { categoryId: selectedCategoryId || undefined },
    { enabled: !!selectedCategoryId }
  );
  
  // Fetch sizes for selected product
  const { data: sizes } = trpc.products.getSizes.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );
  
  // Fetch quantities for selected size
  const { data: quantities } = trpc.products.getSizeQuantities.useQuery(
    { sizeId: selectedSizeId! },
    { enabled: !!selectedSizeId }
  );
  
  // Fetch addons for selected product
  const { data: addons } = trpc.products.getAddons.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  // Get selected items for display
  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const selectedSize = sizes?.find(s => s.id === selectedSizeId);
  const selectedQuantity = quantities?.find(q => q.id === selectedQuantityId);
  const selectedAddonItems = addons?.filter(a => selectedAddons.includes(a.id)) || [];

  // Calculate total price
  const calculateTotal = () => {
    if (!selectedQuantity) return 0;
    let total = parseFloat(selectedQuantity.price);
    
    selectedAddonItems.forEach(addon => {
      if (addon.priceType === 'fixed') {
        total += parseFloat(addon.price);
      } else if (addon.priceType === 'percentage') {
        total += (parseFloat(selectedQuantity.price) * parseFloat(addon.price) / 100);
      }
    });
    
    return total;
  };

  // File handling
  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `סוג קובץ לא מורשה`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `הקובץ גדול מדי`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(`ניתן להעלות עד ${MAX_FILES} קבצים`);
      return;
    }

    const newFiles: UploadedFile[] = files.map(file => {
      const error = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        error: error || undefined,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    });

    const validFiles = newFiles.filter(f => !f.error);
    setUploadedFiles(prev => [...prev, ...validFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  // Navigation
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddons([]);
    setStep('product');
  };

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddons([]);
    setStep('size');
  };

  const handleSizeSelect = (sizeId: number) => {
    setSelectedSizeId(sizeId);
    setSelectedQuantityId(null);
    setStep('quantity');
  };

  const handleQuantitySelect = (quantityId: number) => {
    setSelectedQuantityId(quantityId);
    // Check if there are addons
    if (addons && addons.length > 0) {
      setStep('addons');
    } else {
      setStep('details');
    }
  };

  const handleAddonToggle = (addonId: number) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleBack = () => {
    switch (step) {
      case 'product':
        setStep('category');
        break;
      case 'size':
        setStep('product');
        break;
      case 'quantity':
        setStep('size');
        break;
      case 'addons':
        setStep('quantity');
        break;
      case 'details':
        if (addons && addons.length > 0) {
          setStep('addons');
        } else {
          setStep('quantity');
        }
        break;
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!customerName || !customerPhone) {
      toast.error("נא למלא שם וטלפון");
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', customerName);
      formData.append('email', customerEmail);
      formData.append('phone', customerPhone);
      formData.append('companyName', customerCompany);
      formData.append('description', notes);
      
      // Add product selection info
      if (selectedProductId) {
        formData.append('productId', String(selectedProductId));
      }
      if (selectedSizeId) {
        formData.append('sizeId', String(selectedSizeId));
      }
      if (selectedQuantityId) {
        formData.append('quantityId', String(selectedQuantityId));
      }
      if (selectedAddons.length > 0) {
        formData.append('addons', JSON.stringify(selectedAddons));
      }
      
      // Add files
      uploadedFiles.forEach((uploadedFile) => {
        formData.append(`files`, uploadedFile.file);
      });

      const response = await fetch("/api/customers/signup-with-files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "שגיאה בשליחת הבקשה");
        return;
      }

      setStep('success');
      toast.success("הבקשה נשלחה בהצלחה!");
    } catch (err) {
      toast.error("שגיאה בשליחת הבקשה");
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "התחברות נכשלה");
        return;
      }

      toast.success("התחברת בהצלחה!");
      await refresh();
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoginLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep('category');
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSelectedAddons([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerCompany("");
    setNotes("");
    setUploadedFiles([]);
  };

  // Get icon for category
  const getCategoryIcon = (iconName: string | null) => {
    if (!iconName) return Package;
    return categoryIcons[iconName] || Package;
  };

  // Render success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">הבקשה נשלחה!</h1>
          <p className="text-slate-600 mb-8">
            קיבלנו את הבקשה שלך ונחזור אליך בהקדם עם הצעת מחיר מותאמת.
          </p>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            בקשה חדשה
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-sm font-bold text-white">QF</span>
            </div>
            <span className="text-lg font-bold text-slate-800">QuoteFlow</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-600"
            onClick={() => setShowLoginModal(true)}
          >
            <LogIn className="ml-2 h-4 w-4" />
            התחברות
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* Progress indicator */}
          {step !== 'category' && (
            <div className="mb-8">
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-4"
              >
                <ChevronLeft className="h-4 w-4" />
                חזרה
              </button>
              
              {/* Selection summary */}
              <div className="flex flex-wrap gap-2 text-sm">
                {selectedCategory && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {selectedCategory.name}
                  </span>
                )}
                {selectedProduct && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    {selectedProduct.name}
                  </span>
                )}
                {selectedSize && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    {selectedSize.name}
                  </span>
                )}
                {selectedQuantity && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                    {selectedQuantity.quantity} יח'
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step: Category */}
          {step === 'category' && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                  מה תרצו להדפיס?
                </h1>
                <p className="text-slate-500 text-lg">בחרו תחום ונבנה יחד את ההזמנה</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories?.map((category) => {
                  const IconComponent = getCategoryIcon(category.icon);
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="group p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mx-auto mb-4 transition-colors">
                        <IconComponent className="h-7 w-7 text-slate-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {category.name}
                      </h3>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Product */}
          {step === 'product' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">בחרו מוצר</h2>
                <p className="text-slate-500">מוצרים בתחום {selectedCategory?.name}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products?.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className="group p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-right"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                        <Package className="h-6 w-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Size */}
          {step === 'size' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">בחרו גודל</h2>
                <p className="text-slate-500">גדלים זמינים ל{selectedProduct?.name}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sizes?.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSizeSelect(size.id)}
                    className="group p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center"
                  >
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                      {size.name}
                    </h3>
                    {size.dimensions && (
                      <p className="text-sm text-slate-400 mt-1">{size.dimensions}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Quantity */}
          {step === 'quantity' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">בחרו כמות</h2>
                <p className="text-slate-500">כמויות ומחירים ל{selectedSize?.name}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {quantities?.map((qty) => (
                  <button
                    key={qty.id}
                    onClick={() => handleQuantitySelect(qty.id)}
                    className="group p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-center"
                  >
                    <div className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {qty.quantity}
                    </div>
                    <div className="text-sm text-slate-500">יחידות</div>
                    <div className="mt-3 text-xl font-bold text-green-600">
                      ₪{parseFloat(qty.price).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Addons */}
          {step === 'addons' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">תוספות</h2>
                <p className="text-slate-500">בחרו תוספות לשדרוג ההזמנה (אופציונלי)</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {addons?.filter(a => a.isActive !== false).map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      onClick={() => handleAddonToggle(addon.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-right flex items-center justify-between ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          <Sparkles className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <h3 className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                            {addon.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {addon.priceType === 'percentage' 
                              ? `+${addon.price}%` 
                              : `+₪${parseFloat(addon.price).toLocaleString()}`
                            }
                          </p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="text-center pt-4">
                <Button 
                  onClick={() => setStep('details')}
                  size="lg"
                  className="px-8"
                >
                  המשך
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="space-y-8 max-w-xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">פרטים אחרונים</h2>
                <p className="text-slate-500">איך ניצור איתך קשר?</p>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-4">סיכום ההזמנה</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">מוצר:</span>
                    <span className="font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">גודל:</span>
                    <span className="font-medium">{selectedSize?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">כמות:</span>
                    <span className="font-medium">{selectedQuantity?.quantity} יח'</span>
                  </div>
                  {selectedAddonItems.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">תוספות:</span>
                      <span className="font-medium">{selectedAddonItems.map(a => a.name).join(', ')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">סה"כ:</span>
                      <span className="font-bold text-green-600">₪{calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contact form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="שם מלא *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pr-10 h-12 bg-white"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="טלפון *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pr-10 h-12 bg-white"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="אימייל"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="pr-10 h-12 bg-white"
                      dir="ltr"
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="שם החברה"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="pr-10 h-12 bg-white"
                    />
                  </div>
                </div>
                
                <textarea
                  placeholder="הערות נוספות..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24 px-4 py-3 rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* File upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_EXTENSIONS.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-500">העלאת קבצים (אופציונלי)</span>
                  </label>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadedFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                          {f.preview ? (
                            <img src={f.preview} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <File className="w-10 h-10 text-slate-400 p-2" />
                          )}
                          <span className="flex-1 text-sm truncate">{f.file.name}</span>
                          <button onClick={() => removeFile(f.id)} className="p-1 hover:bg-slate-200 rounded">
                            <X className="h-4 w-4 text-slate-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={submitLoading || !customerName || !customerPhone}
                size="lg"
                className="w-full h-14 text-lg bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    שליחת בקשה
                    <CheckCircle className="mr-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">התחברות</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="אימייל"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pr-10"
                  required
                />
              </div>
              <Input
                type="password"
                placeholder="סיסמה"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={loginLoading} className="flex-1">
                  {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחברות"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowLoginModal(false)} className="flex-1">
                  ביטול
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
