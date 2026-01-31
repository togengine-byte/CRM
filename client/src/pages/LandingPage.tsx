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
  Plus,
  Trash2,
  Image,
  Palette,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// Allowed file types for security
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10;

interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  error?: string;
  validationErrors?: ValidationIssue[];
  validationWarnings?: ValidationIssue[];
  validationPassed?: boolean;
  uploading?: boolean;
  uploaded?: boolean;
  s3Key?: string;
  s3Url?: string;
  needsGraphicDesign?: boolean;
  imageDimensions?: { width: number; height: number };
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

interface Size {
  id: number;
  name: string;
  dimensions?: string;
  graphicDesignPrice?: string;
}

interface Quantity {
  id: number;
  quantity: number;
  price: string;
}

interface SelectedProduct {
  productId: number;
  productName: string;
  sizeId: number;
  sizeName: string;
  quantityId: number;
  quantity: number;
  price: number;
  needsGraphicDesign?: boolean;
  graphicDesignPrice?: number;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuthContext();
  
  // Product selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
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

  // Get selected items
  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const selectedSize = sizes?.find((s: Size) => s.id === selectedSizeId);
  const selectedQuantity = quantities?.find((q: Quantity) => q.id === selectedQuantityId);

  // Mutations for submitting quote requests
  const createWithQuoteMutation = trpc.customers.createWithQuote.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("הבקשה נשלחה בהצלחה!");
    },
    onError: (error) => {
      console.error('Submit error:', error);
      setSubmitError("שגיאה בשליחת הבקשה");
      setSubmitErrorDetails(["אנא נסה שוב מאוחר יותר"]);
    },
  });

  const createQuoteWithFilesOnlyMutation = trpc.customers.createQuoteWithFilesOnly.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("הבקשה נשלחה בהצלחה!");
    },
    onError: (error) => {
      console.error('Submit error:', error);
      setSubmitError("שגיאה בשליחת הבקשה");
      setSubmitErrorDetails(["אנא נסה שוב מאוחר יותר"]);
    },
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  };

  // Parse dimensions string (e.g., "80x200" -> { width: 80, height: 200 })
  const parseDimensions = (dimensions?: string): { widthMm: number; heightMm: number } | null => {
    if (!dimensions) return null;
    const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (!match) return null;
    return {
      widthMm: parseFloat(match[1]) * 10, // cm to mm
      heightMm: parseFloat(match[2]) * 10,
    };
  };

  // Validate file against product requirements
  const validateFileForProduct = async (
    file: File, 
    imageDimensions: { width: number; height: number } | null,
    categoryId: number | null,
    sizeId: number | null,
    sizeDimensions?: string
  ): Promise<{ errors: ValidationIssue[]; warnings: ValidationIssue[] }> => {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Basic validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push({
        type: 'format',
        severity: 'error',
        message: 'פורמט קובץ לא נתמך',
        details: `הפורמט ${extension.toUpperCase()} אינו מותר`,
      });
      return { errors, warnings };
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        type: 'filesize',
        severity: 'error',
        message: 'קובץ גדול מדי',
        details: `גודל הקובץ ${(file.size / 1024 / 1024).toFixed(1)}MB חורג מהמקסימום`,
      });
      return { errors, warnings };
    }

    // If we have image dimensions and target dimensions, check DPI
    if (imageDimensions && sizeDimensions) {
      const targetDims = parseDimensions(sizeDimensions);
      if (targetDims) {
        // Calculate DPI
        const dpiWidth = (imageDimensions.width / targetDims.widthMm) * 25.4;
        const dpiHeight = (imageDimensions.height / targetDims.heightMm) * 25.4;
        const avgDpi = Math.round((dpiWidth + dpiHeight) / 2);

        // Check DPI (minimum 150 for acceptable, 300 for optimal)
        if (avgDpi < 100) {
          errors.push({
            type: 'dpi',
            severity: 'error',
            message: 'רזולוציה נמוכה מדי',
            details: `הרזולוציה ${avgDpi} DPI נמוכה מדי להדפסה איכותית (מינימום 150 DPI)`,
          });
        } else if (avgDpi < 150) {
          warnings.push({
            type: 'dpi',
            severity: 'warning',
            message: 'רזולוציה נמוכה',
            details: `הרזולוציה ${avgDpi} DPI עשויה לגרום לתוצאה לא אופטימלית (מומלץ 300 DPI)`,
          });
        }

        // Check aspect ratio
        const fileRatio = imageDimensions.width / imageDimensions.height;
        const targetRatio = targetDims.widthMm / targetDims.heightMm;
        const ratioDiff = Math.abs(fileRatio - targetRatio) / targetRatio * 100;

        if (ratioDiff > 10) {
          warnings.push({
            type: 'aspectratio',
            severity: 'warning',
            message: 'פרופורציה שונה',
            details: `יחס הקובץ שונה מהגודל הנבחר - הספק יתאים את הקובץ`,
          });
        }
      }
    }

    return { errors, warnings };
  };

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(`ניתן להעלות עד ${MAX_FILES} קבצים`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    
    for (const file of files) {
      const basicError = validateFileBasic(file);
      
      if (basicError) {
        toast.error(`${file.name}: ${basicError}`);
      } else {
        // Get image dimensions for validation
        const imageDimensions = await getImageDimensions(file);
        
        const newFile: UploadedFile = {
          file,
          id: Math.random().toString(36).substr(2, 9),
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          uploading: true,
          uploaded: false,
          imageDimensions: imageDimensions || undefined,
        };
        newFiles.push(newFile);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files to S3 and validate
    for (const uploadedFile of newFiles) {
      await uploadFileToS3(uploadedFile);
      
      // Validate after upload if we have a selected size
      if (selectedSizeId && selectedSize) {
        const { errors, warnings } = await validateFileForProduct(
          uploadedFile.file,
          uploadedFile.imageDimensions || null,
          selectedCategoryId,
          selectedSizeId,
          selectedSize.dimensions
        );
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { 
            ...f, 
            validationErrors: errors,
            validationWarnings: warnings,
            validationPassed: errors.length === 0,
          } : f
        ));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Re-validate files when size changes
  useEffect(() => {
    if (selectedSizeId && selectedSize && uploadedFiles.length > 0) {
      const revalidateFiles = async () => {
        const updatedFiles = await Promise.all(
          uploadedFiles.map(async (f) => {
            if (!f.uploaded) return f;
            
            const { errors, warnings } = await validateFileForProduct(
              f.file,
              f.imageDimensions || null,
              selectedCategoryId,
              selectedSizeId,
              selectedSize.dimensions
            );
            
            return {
              ...f,
              validationErrors: errors,
              validationWarnings: warnings,
              validationPassed: errors.length === 0,
            };
          })
        );
        setUploadedFiles(updatedFiles);
      };
      revalidateFiles();
    }
  }, [selectedSizeId, selectedSize?.dimensions]);

  const uploadFileToS3 = async (uploadedFile: UploadedFile) => {
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('context', 'quote');

      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { 
          ...f, 
          uploading: false, 
          uploaded: true,
          s3Key: result.key,
          s3Url: result.url,
        } : f
      ));
    } catch (error) {
      toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, uploading: false, error: 'שגיאה בהעלאה' } : f
      ));
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  // Toggle graphic design for a file
  const toggleGraphicDesign = (id: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === id ? { ...f, needsGraphicDesign: !f.needsGraphicDesign } : f
    ));
  };

  // Check if any file has critical errors
  const hasFileErrors = uploadedFiles.some(f => 
    f.validationErrors && f.validationErrors.length > 0 && !f.needsGraphicDesign
  );

  // Add product to list
  const handleAddProduct = () => {
    if (!selectedProductId || !selectedSizeId || !selectedQuantityId) {
      toast.error("יש לבחור מוצר, גודל וכמות");
      return;
    }

    // Check if any uploaded file needs graphic design
    const filesNeedGraphic = uploadedFiles.some(f => f.needsGraphicDesign);
    const graphicPrice = filesNeedGraphic && selectedSize?.graphicDesignPrice 
      ? parseFloat(selectedSize.graphicDesignPrice) 
      : 0;

    const newProduct: SelectedProduct = {
      productId: selectedProductId,
      productName: selectedProduct?.name || "",
      sizeId: selectedSizeId,
      sizeName: selectedSize?.name || "",
      quantityId: selectedQuantityId,
      quantity: selectedQuantity?.quantity || 0,
      price: parseFloat(selectedQuantity?.price || "0"),
      needsGraphicDesign: filesNeedGraphic,
      graphicDesignPrice: graphicPrice,
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    
    // Reset selection
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
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
    if (!customerEmail.trim()) {
      errors.push("אימייל הוא שדה חובה");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.push("כתובת אימייל לא תקינה");
    }

    // Check if we have products OR (files + description)
    const hasProducts = selectedProducts.length > 0;
    const hasFilesWithDescription = uploadedFiles.some(f => f.uploaded) && description.trim().length > 0;

    if (!hasProducts && !hasFilesWithDescription) {
      errors.push("יש להוסיף מוצרים או להעלות קבצים עם תיאור");
    }

    // Check for unresolved file errors
    if (hasFileErrors) {
      errors.push("יש קבצים עם שגיאות - יש להחליף אותם או לבחור 'צריך גרפיקה'");
    }
    
    if (errors.length > 0) {
      setSubmitError("הבקשה לא נשלחה מהסיבות הבאות:");
      setSubmitErrorDetails(errors);
      return;
    }

    setSubmitLoading(true);

    try {
      // Get uploaded file info with validation warnings
      const fileAttachments = uploadedFiles
        .filter(f => f.uploaded && f.s3Key)
        .map(f => ({
          fileName: f.file.name,
          fileUrl: f.s3Url || '',
          s3Key: f.s3Key || '',
          fileSize: f.file.size,
          mimeType: f.file.type,
          needsGraphicDesign: f.needsGraphicDesign,
          validationWarnings: f.validationWarnings?.map(w => w.message),
        }));

      // Build notes with validation warnings
      let notes = description || "";
      const warningNotes: string[] = [];
      
      uploadedFiles.forEach(f => {
        if (f.validationWarnings && f.validationWarnings.length > 0) {
          warningNotes.push(`${f.file.name}: ${f.validationWarnings.map(w => w.details || w.message).join(', ')}`);
        }
        if (f.needsGraphicDesign) {
          warningNotes.push(`${f.file.name}: נדרש עיצוב גרפי`);
        }
      });

      if (warningNotes.length > 0) {
        notes += "\n\n--- הערות וולידציה ---\n" + warningNotes.join("\n");
      }

      if (hasProducts) {
        // Submit with products via tRPC
        await createWithQuoteMutation.mutateAsync({
          customerInfo: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
            companyName: customerCompany.trim() || undefined,
          },
          quoteItems: selectedProducts.map(p => ({
            sizeQuantityId: p.quantityId,
            quantity: p.quantity,
            needsGraphicDesign: p.needsGraphicDesign,
            graphicDesignPrice: p.graphicDesignPrice,
          })),
          notes: notes || undefined,
          attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        });
      } else {
        // Submit with files only
        await createQuoteWithFilesOnlyMutation.mutateAsync({
          customerInfo: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
            companyName: customerCompany.trim() || undefined,
          },
          description: notes,
          attachments: fileAttachments,
        });
      }
      // Success handled by mutation onSuccess
    } catch (err) {
      // Error handled by mutation onError
      console.error('Submit error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      
      if (response.ok) {
        await refresh();
        setShowLoginModal(false);
        setLocation("/dashboard");
      } else {
        toast.error("שם משתמש או סיסמה שגויים");
      }
    } catch (error) {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleReset = () => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerCompany("");
    setDescription("");
    setUploadedFiles([]);
    setSelectedProducts([]);
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
    setSubmitted(false);
    setSubmitError(null);
    setSubmitErrorDetails([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Get graphic design price for current size
  const currentGraphicPrice = selectedSize?.graphicDesignPrice 
    ? parseFloat(selectedSize.graphicDesignPrice) 
    : 0;

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">הבקשה נשלחה בהצלחה!</h2>
          <p className="text-slate-500 mb-6">נחזור אליכם בהקדם עם הצעת מחיר מותאמת</p>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            שליחת בקשה נוספת
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-white">QF</span>
            </div>
            <span className="text-base font-bold text-slate-800">QuoteFlow</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-600 h-8"
            onClick={() => setShowLoginModal(true)}
          >
            <LogIn className="ml-1 h-4 w-4" />
            התחברות
          </Button>
        </div>
      </header>

      {/* Main Content - Full Height Layout */}
      <main className="h-[calc(100vh-3.5rem)] p-3 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-3">
            <h1 className="text-xl font-bold text-slate-900">בקשת הצעת מחיר</h1>
            <p className="text-slate-500 text-sm">בחרו מוצר או תארו את הפרויקט שלכם ונחזור אליכם עם הצעה מותאמת</p>
          </div>

          {/* Form - 3 Column Layout */}
          <form onSubmit={handleSubmit} className="h-[calc(100%-4rem)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
              
              {/* Column 1: Customer Info */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  פרטי לקוח
                </h3>
                
                <div className="space-y-2 flex-1">
                  <div className="relative">
                    <User className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="שם מלא *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="אימייל *"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
                      dir="ltr"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="טלפון *"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
                      dir="ltr"
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="שם החברה"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Product Selection */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  בחירת מוצר
                  <span className="text-xs text-slate-400 font-normal">(אופציונלי)</span>
                </h3>
                
                <div className="space-y-2">
                  {/* Category */}
                  <select
                    value={selectedCategoryId || ""}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedProductId(null);
                      setSelectedSizeId(null);
                      setSelectedQuantityId(null);
                    }}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">בחר קטגוריה</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Product */}
                  <select
                    value={selectedProductId || ""}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedSizeId(null);
                      setSelectedQuantityId(null);
                    }}
                    disabled={!selectedCategoryId}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">בחר מוצר</option>
                    {products?.map((prod) => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>

                  {/* Size */}
                  <select
                    value={selectedSizeId || ""}
                    onChange={(e) => {
                      setSelectedSizeId(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedQuantityId(null);
                    }}
                    disabled={!selectedProductId}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">בחר גודל</option>
                    {sizes?.map((size: Size) => (
                      <option key={size.id} value={size.id}>
                        {size.name} {size.dimensions && `(${size.dimensions})`}
                      </option>
                    ))}
                  </select>

                  {/* Quantity */}
                  <select
                    value={selectedQuantityId || ""}
                    onChange={(e) => setSelectedQuantityId(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!selectedSizeId}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">בחר כמות</option>
                    {quantities?.map((qty: Quantity) => (
                      <option key={qty.id} value={qty.id}>
                        {qty.quantity} יח' - ₪{parseFloat(qty.price).toLocaleString()}
                      </option>
                    ))}
                  </select>

                  {/* Add Button */}
                  <Button 
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedQuantityId}
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף לרשימה
                  </Button>
                </div>

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <div className="mt-3 border-t pt-3 flex-1 overflow-auto">
                    <p className="text-xs text-slate-500 mb-2">מוצרים שנבחרו:</p>
                    <div className="space-y-1.5">
                      {selectedProducts.map((prod, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{prod.productName}</p>
                            <p className="text-slate-500">
                              {prod.sizeName} • {prod.quantity} יח' • ₪{prod.price.toLocaleString()}
                              {prod.needsGraphicDesign && prod.graphicDesignPrice && (
                                <span className="text-purple-600 mr-1">
                                  + גרפיקה ₪{prod.graphicDesignPrice}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 3: Files & Description */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  קבצים ותיאור
                </h3>
                
                {/* File Upload */}
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
                  className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-sm"
                >
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-500">לחצו להעלאת קבצים</span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  PDF, JPG, PNG, AI, EPS, PSD (עד 100MB)
                </p>

                {/* Uploaded Files with Validation */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-auto">
                    {uploadedFiles.map((f) => (
                      <div key={f.id} className={`p-2 rounded-lg text-xs ${
                        f.validationErrors && f.validationErrors.length > 0 && !f.needsGraphicDesign
                          ? 'bg-red-50 border border-red-200'
                          : f.validationWarnings && f.validationWarnings.length > 0
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-slate-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {f.preview ? (
                            <img src={f.preview} alt="" className="w-6 h-6 object-cover rounded" />
                          ) : (
                            <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                              {getFileIcon(f.file)}
                            </div>
                          )}
                          <span className="flex-1 truncate">{f.file.name}</span>
                          {f.uploading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                          {f.uploaded && !f.validationErrors?.length && <Check className="h-3 w-3 text-green-500" />}
                          {f.validationErrors && f.validationErrors.length > 0 && !f.needsGraphicDesign && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          {f.validationWarnings && f.validationWarnings.length > 0 && !f.validationErrors?.length && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                          <button type="button" onClick={() => removeFile(f.id)} className="p-0.5 hover:bg-slate-200 rounded">
                            <X className="h-3 w-3 text-slate-500" />
                          </button>
                        </div>
                        
                        {/* Validation Errors */}
                        {f.validationErrors && f.validationErrors.length > 0 && !f.needsGraphicDesign && (
                          <div className="mt-1.5 space-y-1">
                            {f.validationErrors.map((err, i) => (
                              <p key={i} className="text-red-600 text-[10px]">
                                ❌ {err.message} {err.details && `- ${err.details}`}
                              </p>
                            ))}
                            {/* Graphic Design Option */}
                            {currentGraphicPrice > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleGraphicDesign(f.id)}
                                className="flex items-center gap-1 mt-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] hover:bg-purple-200"
                              >
                                <Palette className="h-3 w-3" />
                                אנחנו נעשה לך גרפיקה (₪{currentGraphicPrice})
                              </button>
                            )}
                          </div>
                        )}

                        {/* Validation Warnings */}
                        {f.validationWarnings && f.validationWarnings.length > 0 && !f.validationErrors?.length && (
                          <div className="mt-1.5">
                            {f.validationWarnings.map((warn, i) => (
                              <p key={i} className="text-orange-600 text-[10px]">
                                ⚠️ {warn.message}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Graphic Design Selected */}
                        {f.needsGraphicDesign && (
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-purple-600 text-[10px] flex items-center gap-1">
                              <Palette className="h-3 w-3" />
                              נבחר עיצוב גרפי (₪{currentGraphicPrice})
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGraphicDesign(f.id)}
                              className="text-[10px] text-slate-500 hover:text-red-500"
                            >
                              ביטול
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div className="mt-3 flex-1 flex flex-col">
                  <label className="text-xs text-slate-600 mb-1">
                    תיאור הפרויקט
                    {selectedProducts.length === 0 && uploadedFiles.length > 0 && (
                      <span className="text-red-500 mr-1">*</span>
                    )}
                  </label>
                  <textarea
                    placeholder="כמות, גודל, צבעים, גימור מיוחד..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex-1 min-h-[60px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Error Messages */}
                {submitError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs">
                    <p className="font-medium text-red-800">{submitError}</p>
                    <ul className="mt-1 space-y-0.5">
                      {submitErrorDetails.map((detail, index) => (
                        <li key={index} className="text-red-700 flex items-center gap-1">
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
                  disabled={submitLoading || !customerName || !customerPhone || !customerEmail || hasFileErrors}
                  className="mt-3 h-10 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="ml-2 h-4 w-4" />
                      שלח בקשה
                    </>
                  )}
                </Button>

                {/* Help Text */}
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  {hasFileErrors 
                    ? "יש לתקן שגיאות בקבצים לפני שליחה"
                    : selectedProducts.length > 0 
                      ? `${selectedProducts.length} מוצרים נבחרו`
                      : uploadedFiles.length > 0
                        ? "ניתן לשלוח עם קבצים ותיאור בלבד"
                        : "בחרו מוצרים או העלו קבצים"
                  }
                </p>
              </div>
            </div>
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
