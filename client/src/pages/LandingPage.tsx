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
  Mail,
  Phone,
  User,
  Building2,
  Send,
  FileText,
  Package,
  ChevronDown,
  AlertTriangle,
  Check,
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
  validationWarnings?: string[];
  validationPassed?: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuthContext();
  
  // Product selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [description, setDescription] = useState("");
  
  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [validatingFiles, setValidatingFiles] = useState(false);
  
  // Loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Fetch categories
  const { data: categories } = trpc.products.getCategories.useQuery();
  
  // Fetch products for selected category
  const { data: products } = trpc.products.list.useQuery(
    { categoryId: selectedCategoryId || undefined },
    { enabled: !!selectedCategoryId }
  );

  // Get selected items
  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedProduct = products?.find(p => p.id === selectedProductId);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCategoryDropdown(false);
      setShowProductDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // File validation
  const validateFileBasic = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `סוג קובץ לא מורשה`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `הקובץ גדול מדי (מקסימום 100MB)`;
    }
    return null;
  };

  // Validate file with server validation rules
  const validateFileWithServer = async (file: File): Promise<{ warnings: string[], passed: boolean }> => {
    try {
      // Get image dimensions if it's an image
      if (file.type.startsWith('image/')) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = async () => {
            const warnings: string[] = [];
            
            // Check DPI (assuming 72 DPI for web images, need at least 300 for print)
            // This is a simplified check - real DPI would need to be read from file metadata
            const estimatedDPI = Math.min(img.width, img.height) / 3; // rough estimate
            if (estimatedDPI < 300) {
              warnings.push(`רזולוציה נמוכה - מומלץ לפחות 300 DPI להדפסה`);
            }
            
            // Check minimum dimensions
            if (img.width < 500 || img.height < 500) {
              warnings.push(`תמונה קטנה מדי - מומלץ לפחות 500x500 פיקסלים`);
            }
            
            URL.revokeObjectURL(img.src);
            resolve({ warnings, passed: warnings.length === 0 });
          };
          img.onerror = () => {
            resolve({ warnings: ['לא ניתן לקרוא את הקובץ'], passed: false });
          };
          img.src = URL.createObjectURL(file);
        });
      }
      
      // For non-image files, just pass
      return { warnings: [], passed: true };
    } catch (err) {
      return { warnings: ['שגיאה בבדיקת הקובץ'], passed: false };
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(`ניתן להעלות עד ${MAX_FILES} קבצים`);
      return;
    }

    setValidatingFiles(true);

    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      const basicError = validateFileBasic(file);
      
      if (basicError) {
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          error: basicError,
        });
      } else {
        // Validate with server rules
        const { warnings, passed } = await validateFileWithServer(file);
        
        newFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          validationWarnings: warnings,
          validationPassed: passed,
        });
      }
    }

    // Filter out files with basic errors
    const validFiles = newFiles.filter(f => !f.error);
    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // Show warnings for files with validation issues
    const filesWithWarnings = validFiles.filter(f => f.validationWarnings && f.validationWarnings.length > 0);
    if (filesWithWarnings.length > 0) {
      toast.warning(`${filesWithWarnings.length} קבצים עם אזהרות - בדוק את הפרטים`);
    }

    setValidatingFiles(false);

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

  // Handle category select
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedProductId(null);
    setShowCategoryDropdown(false);
  };

  // Handle product select
  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    setShowProductDropdown(false);
  };

  // State for error messages
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitErrorDetails([]);
    
    // Validate required fields
    const errors: string[] = [];
    if (!customerName.trim()) {
      errors.push("שם מלא הוא שדה חובה");
    }
    if (!customerPhone.trim()) {
      errors.push("מספר טלפון הוא שדה חובה");
    } else if (!/^[0-9\-\+\s]{9,15}$/.test(customerPhone.trim())) {
      errors.push("מספר טלפון לא תקין");
    }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.push("כתובת אימייל לא תקינה");
    }
    
    if (errors.length > 0) {
      setSubmitError("הבקשה לא נשלחה מהסיבות הבאות:");
      setSubmitErrorDetails(errors);
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', customerName.trim());
      formData.append('email', customerEmail.trim());
      formData.append('phone', customerPhone.trim());
      formData.append('companyName', customerCompany.trim());
      
      // Build description with product info
      let fullDescription = "";
      if (selectedProduct) {
        fullDescription += `מוצר: ${selectedProduct.name}\n`;
        if (selectedCategory) {
          fullDescription += `קטגוריה: ${selectedCategory.name}\n`;
        }
        fullDescription += "\n";
      }
      if (description) {
        fullDescription += description;
      }
      formData.append('description', fullDescription);
      
      // Add product ID if selected
      if (selectedProductId) {
        formData.append('productId', String(selectedProductId));
      }
      
      // Add files
      uploadedFiles.forEach((uploadedFile) => {
        formData.append(`files`, uploadedFile.file);
      });

      // Collect all validation warnings from files
      const allWarnings = uploadedFiles
        .filter(f => f.validationWarnings && f.validationWarnings.length > 0)
        .map(f => ({
          fileName: f.file.name,
          warnings: f.validationWarnings,
          passed: f.validationPassed,
        }));
      
      if (allWarnings.length > 0) {
        formData.append('fileValidationWarnings', JSON.stringify(allWarnings));
      }

      const response = await fetch("/api/customers/signup-with-files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        const serverErrors: string[] = [];
        
        if (data.error) {
          serverErrors.push(data.error);
        }
        if (data.details && Array.isArray(data.details)) {
          serverErrors.push(...data.details);
        }
        
        setSubmitError("הבקשה לא נשלחה מהסיבות הבאות:");
        setSubmitErrorDetails(serverErrors.length > 0 ? serverErrors : ["שגיאה בשרת, נסה שוב מאוחר יותר"]);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError("הבקשה לא נשלחה מהסיבות הבאות:");
      setSubmitErrorDetails(["שגיאת תקשורת, בדוק את החיבור לאינטרנט ונסה שוב"]);
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
        setLoginLoading(false);
        return;
      }

      toast.success("התחברת בהצלחה!");
      setShowLoginModal(false);
      await refresh();
      setLocation("/dashboard");
    } catch (err) {
      toast.error("שגיאה בהתחברות");
      setLoginLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSubmitted(false);
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerCompany("");
    setDescription("");
    setUploadedFiles([]);
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">הבקשה נשלחה!</h1>
          <p className="text-slate-600 mb-8">
            קיבלנו את הבקשה שלך ונחזור אליך בהקדם עם הצעת מחיר מותאמת.
          </p>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            שליחת בקשה נוספת
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
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
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              בקשת הצעת מחיר
            </h1>
            <p className="text-slate-500 text-lg">
              בחרו מוצר או תארו את הפרויקט שלכם ונחזור אליכם עם הצעה מותאמת
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Product Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block text-lg font-semibold text-slate-800 mb-4">
                <Package className="inline-block h-5 w-5 ml-2 text-blue-600" />
                בחירת מוצר
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Dropdown */}
                <div className="relative">
                  <div 
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCategoryDropdown(!showCategoryDropdown);
                      setShowProductDropdown(false);
                    }}
                  >
                    <span className={selectedCategory ? "text-slate-800" : "text-slate-400"}>
                      {selectedCategory?.name || "בחר קטגוריה"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showCategoryDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {categories?.map((category) => (
                        <div
                          key={category.id}
                          className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                            selectedCategoryId === category.id ? 'bg-blue-100' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategorySelect(category.id);
                          }}
                        >
                          <span>{category.name}</span>
                          {selectedCategoryId === category.id && (
                            <Check className="h-4 w-4 text-blue-600 mr-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Dropdown */}
                <div className="relative">
                  <div 
                    className={`w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between transition-colors ${
                      selectedCategoryId ? 'cursor-pointer hover:border-blue-400' : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={(e) => {
                      if (!selectedCategoryId) return;
                      e.stopPropagation();
                      setShowProductDropdown(!showProductDropdown);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <span className={selectedProduct ? "text-slate-800" : "text-slate-400"}>
                      {selectedProduct?.name || "בחר מוצר"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showProductDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {showProductDropdown && products && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className={`p-3 cursor-pointer hover:bg-blue-50 ${
                            selectedProductId === product.id ? 'bg-blue-100' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductSelect(product.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{product.name}</span>
                            {selectedProductId === product.id && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-slate-500 mt-1">{product.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description - Free text */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block text-lg font-semibold text-slate-800 mb-3">
                <FileText className="inline-block h-5 w-5 ml-2 text-blue-600" />
                פרטים נוספים
              </label>
              <textarea
                placeholder="תארו את הפרויקט שלכם... כמות, גודל, צבעים, גימור מיוחד וכו'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* File upload */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block text-lg font-semibold text-slate-800 mb-3">
                <Upload className="inline-block h-5 w-5 ml-2 text-blue-600" />
                קבצים לעיצוב
                <span className="text-sm font-normal text-slate-400 mr-2">(אופציונלי)</span>
              </label>
              
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
                className={`flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all ${
                  validatingFiles ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {validatingFiles ? (
                  <>
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    <span className="text-slate-500">בודק קבצים...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-slate-400" />
                    <span className="text-slate-500">לחצו להעלאת קבצים או גררו לכאן</span>
                  </>
                )}
              </label>
              <p className="text-xs text-slate-400 mt-2 text-center">
                PDF, JPG, PNG, AI, EPS, PSD (עד 100MB לקובץ)
              </p>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((f) => (
                    <div 
                      key={f.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        f.validationWarnings && f.validationWarnings.length > 0 
                          ? 'bg-amber-50 border border-amber-200' 
                          : 'bg-slate-50'
                      }`}
                    >
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                          <File className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        {f.validationWarnings && f.validationWarnings.length > 0 && (
                          <div className="mt-1">
                            {f.validationWarnings.map((warning, idx) => (
                              <p key={idx} className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </p>
                            ))}
                          </div>
                        )}
                        {f.validationPassed && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" />
                            קובץ תקין
                          </p>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeFile(f.id)} 
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block text-lg font-semibold text-slate-800 mb-4">
                <User className="inline-block h-5 w-5 ml-2 text-blue-600" />
                פרטי התקשרות
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="שם מלא *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pr-10 h-12 bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="טלפון *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pr-10 h-12 bg-slate-50 border-slate-200"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="אימייל"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="pr-10 h-12 bg-slate-50 border-slate-200"
                    dir="ltr"
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="שם החברה"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    className="pr-10 h-12 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Error Messages */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 mb-2">{submitError}</h4>
                    <ul className="space-y-1">
                      {submitErrorDetails.map((detail, index) => (
                        <li key={index} className="text-red-700 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <Button 
              type="submit"
              disabled={submitLoading || !customerName || !customerPhone}
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="ml-2 h-5 w-5" />
                  שליחת בקשה להצעת מחיר
                </>
              )}
            </Button>
          </form>
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
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
                  dir="ltr"
                  required
                />
              </div>
              <Input
                type="password"
                placeholder="סיסמה"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                dir="ltr"
                required
              />
              <div className="flex gap-2 pt-2">
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
