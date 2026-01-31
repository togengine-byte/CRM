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
  Plus,
  Trash2,
  Image,
  Palette,
  AlertCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// Allowed file types for security
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.ai', '.eps', '.psd'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

interface ProductFile {
  file: File;
  id: string;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  s3Key?: string;
  s3Url?: string;
  validationErrors?: ValidationIssue[];
  validationWarnings?: ValidationIssue[];
  imageDimensions?: { width: number; height: number };
  needsGraphicDesign?: boolean;
}

interface Category {
  id: number;
  name: string;
  // Validation settings
  validationEnabled?: boolean;
  minDpi?: number;
  maxDpi?: number | null;
  allowedColorspaces?: string[];
  requiredBleedMm?: string;
  requireBleed?: boolean;
  maxFileSizeMb?: number;
  allowedFormats?: string[];
  aspectRatioTolerance?: string;
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
  id: string; // unique id for this selection
  productId: number;
  productName: string;
  categoryId: number;
  categoryValidation?: Category; // הגדרות וולידציה מהקטגוריה
  sizeId: number;
  sizeName: string;
  sizeDimensions?: string;
  quantityId: number;
  quantity: number;
  price: number;
  graphicDesignPrice: number;
  file?: ProductFile;
  needsGraphicDesign?: boolean;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading, refresh } = useAuthContext();
  
  // Product selection (temporary state for adding)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedQuantityId, setSelectedQuantityId] = useState<number | null>(null);
  
  // Selected products list (each with its own file)
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [description, setDescription] = useState("");
  
  // General files (for quote without products)
  const [generalFiles, setGeneralFiles] = useState<ProductFile[]>([]);
  
  // Loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Error state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);

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

  // Parse dimensions string - supports both cm (e.g., "80x200") and mm (e.g., "800x2000")
  // If both numbers are > 500, assume mm; otherwise assume cm
  const parseDimensions = (dimensions?: string): { widthMm: number; heightMm: number } | null => {
    if (!dimensions) return null;
    const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (!match) return null;
    
    let width = parseFloat(match[1]);
    let height = parseFloat(match[2]);
    
    // Auto-detect: if both values are large (>500), assume already in mm
    // Otherwise assume cm and convert to mm
    const isAlreadyMm = width > 500 || height > 500;
    
    return {
      widthMm: isAlreadyMm ? width : width * 10,
      heightMm: isAlreadyMm ? height : height * 10,
    };
  };

  // Validate file against product requirements using category settings
  const validateFileForProduct = async (
    file: File, 
    imageDimensions: { width: number; height: number } | null,
    sizeDimensions?: string,
    categoryValidation?: Category
  ): Promise<{ errors: ValidationIssue[]; warnings: ValidationIssue[] }> => {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Get validation settings from category or use defaults
    const minDpi = categoryValidation?.minDpi ?? 150;
    const maxFileSizeMb = categoryValidation?.maxFileSizeMb ?? 100;
    const allowedFormats = categoryValidation?.allowedFormats ?? ['pdf', 'ai', 'eps', 'tiff', 'jpg', 'png'];
    const aspectRatioTolerance = parseFloat(categoryValidation?.aspectRatioTolerance ?? '10');
    const validationEnabled = categoryValidation?.validationEnabled !== false;

    // If validation is disabled for this category, skip all checks
    if (!validationEnabled) {
      return { errors, warnings };
    }

    // Check file format
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const formatAllowed = allowedFormats.some(fmt => 
      extension === fmt.toLowerCase() || 
      (fmt === 'jpg' && extension === 'jpeg') ||
      (fmt === 'tiff' && extension === 'tif')
    );
    
    if (!formatAllowed) {
      errors.push({
        type: 'format',
        severity: 'error',
        message: 'פורמט קובץ לא נתמך',
        details: `הפורמט ${extension.toUpperCase()} אינו מותר. פורמטים מותרים: ${allowedFormats.join(', ').toUpperCase()}`,
      });
      return { errors, warnings };
    }

    // Check file size
    const fileSizeMb = file.size / 1024 / 1024;
    if (fileSizeMb > maxFileSizeMb) {
      errors.push({
        type: 'filesize',
        severity: 'error',
        message: 'קובץ גדול מדי',
        details: `גודל הקובץ ${fileSizeMb.toFixed(1)}MB חורג מהמקסימום (${maxFileSizeMb}MB)`,
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

        // Check DPI against category settings
        const criticalMinDpi = Math.floor(minDpi * 0.5); // 50% of minDpi is critical error
        
        if (avgDpi < criticalMinDpi) {
          errors.push({
            type: 'dpi',
            severity: 'error',
            message: 'רזולוציה נמוכה מדי',
            details: `הרזולוציה ${avgDpi} DPI נמוכה מדי להדפסה איכותית (מינימום נדרש ${minDpi} DPI)`,
          });
        } else if (avgDpi < minDpi) {
          warnings.push({
            type: 'dpi',
            severity: 'warning',
            message: 'רזולוציה נמוכה',
            details: `הרזולוציה ${avgDpi} DPI נמוכה מהמומלץ (${minDpi} DPI) - עלול להשפיע על האיכות`,
          });
        }

        // Check aspect ratio
        const fileRatio = imageDimensions.width / imageDimensions.height;
        const targetRatio = targetDims.widthMm / targetDims.heightMm;
        const ratioDiff = Math.abs(fileRatio - targetRatio) / targetRatio * 100;

        if (ratioDiff > aspectRatioTolerance) {
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

  // Upload file to S3
  const uploadFileToS3 = async (file: File): Promise<{ key: string; url: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', 'quote');

      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return { key: result.key, url: result.url };
    } catch (error) {
      toast.error(`שגיאה בהעלאת ${file.name}`);
      return null;
    }
  };

  // Handle file upload for a specific product
  const handleProductFileUpload = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Find the product
    const product = selectedProducts.find(p => p.id === productId);
    if (!product) return;

    // Basic validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(`סוג קובץ לא מורשה: ${extension}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`הקובץ גדול מדי (מקסימום 100MB)`);
      return;
    }

    // Get image dimensions
    const imageDimensions = await getImageDimensions(file);

    // Create file object
    const productFile: ProductFile = {
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: true,
      uploaded: false,
      imageDimensions: imageDimensions || undefined,
    };

    // Update product with file (uploading state)
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, file: productFile } : p
    ));

    // Upload to S3
    const s3Result = await uploadFileToS3(file);
    
    if (s3Result) {
      // Validate file against product size using category settings
      const { errors, warnings } = await validateFileForProduct(
        file,
        imageDimensions,
        product.sizeDimensions,
        product.categoryValidation
      );

      // Update product with uploaded file and validation results
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId ? { 
          ...p, 
          file: {
            ...productFile,
            uploading: false,
            uploaded: true,
            s3Key: s3Result.key,
            s3Url: s3Result.url,
            validationErrors: errors,
            validationWarnings: warnings,
          }
        } : p
      ));
    } else {
      // Upload failed
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, file: undefined } : p
      ));
    }

    // Reset input
    e.target.value = '';
  };

  // Handle general file upload (for quote without products)
  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(`סוג קובץ לא מורשה: ${extension}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`הקובץ גדול מדי (מקסימום 100MB)`);
      return;
    }

    const imageDimensions = await getImageDimensions(file);

    const productFile: ProductFile = {
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: true,
      uploaded: false,
      imageDimensions: imageDimensions || undefined,
    };

    setGeneralFiles(prev => [...prev, productFile]);

    // Upload to S3
    const s3Result = await uploadFileToS3(file);
    
    if (s3Result) {
      setGeneralFiles(prev => prev.map(f => 
        f.id === productFile.id ? {
          ...f,
          uploading: false,
          uploaded: true,
          s3Key: s3Result.key,
          s3Url: s3Result.url,
        } : f
      ));
    } else {
      setGeneralFiles(prev => prev.filter(f => f.id !== productFile.id));
    }

    e.target.value = '';
  };

  // Remove file from product
  const removeProductFile = (productId: string) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id === productId && p.file?.preview) {
        URL.revokeObjectURL(p.file.preview);
      }
      return p.id === productId ? { ...p, file: undefined, needsGraphicDesign: false } : p;
    }));
  };

  // Remove general file
  const removeGeneralFile = (fileId: string) => {
    setGeneralFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Toggle graphic design for a product
  const toggleProductGraphicDesign = (productId: string) => {
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, needsGraphicDesign: !p.needsGraphicDesign } : p
    ));
  };

  // Add product to list
  const handleAddProduct = () => {
    if (!selectedProductId || !selectedSizeId || !selectedQuantityId || !selectedCategoryId) {
      toast.error("יש לבחור מוצר, גודל וכמות");
      return;
    }

    // Get category validation settings
    const categoryData = categories?.find(c => c.id === selectedCategoryId);

    const newProduct: SelectedProduct = {
      id: Math.random().toString(36).substr(2, 9),
      productId: selectedProductId,
      productName: selectedProduct?.name || "",
      categoryId: selectedCategoryId,
      categoryValidation: categoryData, // הגדרות וולידציה מהקטגוריה
      sizeId: selectedSizeId,
      sizeName: selectedSize?.name || "",
      sizeDimensions: selectedSize?.dimensions,
      quantityId: selectedQuantityId,
      quantity: selectedQuantity?.quantity || 0,
      price: parseFloat(selectedQuantity?.price || "0"),
      graphicDesignPrice: selectedSize?.graphicDesignPrice ? parseFloat(selectedSize.graphicDesignPrice) : 0,
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    
    // Reset selection
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setSelectedSizeId(null);
    setSelectedQuantityId(null);
  };

  // Remove product
  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const product = prev.find(p => p.id === productId);
      if (product?.file?.preview) {
        URL.revokeObjectURL(product.file.preview);
      }
      return prev.filter(p => p.id !== productId);
    });
  };

  // Check if any product has unresolved file errors
  const hasUnresolvedErrors = selectedProducts.some(p => 
    p.file?.validationErrors && 
    p.file.validationErrors.length > 0 && 
    !p.needsGraphicDesign
  );

  // Calculate total
  const totalPrice = selectedProducts.reduce((sum, p) => {
    let productTotal = p.price;
    if (p.needsGraphicDesign && p.graphicDesignPrice) {
      productTotal += p.graphicDesignPrice;
    }
    return sum + productTotal;
  }, 0);

  // Submit handler
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
    const hasFilesWithDescription = generalFiles.some(f => f.uploaded) && description.trim().length > 0;

    if (!hasProducts && !hasFilesWithDescription) {
      errors.push("יש להוסיף מוצרים או להעלות קבצים עם תיאור");
    }

    // Check for unresolved file errors
    if (hasUnresolvedErrors) {
      errors.push("יש קבצים עם שגיאות - יש להחליף אותם או לבחור 'צריך גרפיקה'");
    }
    
    if (errors.length > 0) {
      setSubmitError("הבקשה לא נשלחה מהסיבות הבאות:");
      setSubmitErrorDetails(errors);
      return;
    }

    setSubmitLoading(true);

    try {
      // Build notes with validation warnings
      let notes = description || "";
      const warningNotes: string[] = [];
      
      selectedProducts.forEach(p => {
        if (p.file?.validationWarnings && p.file.validationWarnings.length > 0) {
          warningNotes.push(`${p.productName} (${p.file.file.name}): ${p.file.validationWarnings.map(w => w.details || w.message).join(', ')}`);
        }
        if (p.needsGraphicDesign) {
          warningNotes.push(`${p.productName}: נדרש עיצוב גרפי`);
        }
      });

      if (warningNotes.length > 0) {
        notes += "\n\n--- הערות וולידציה ---\n" + warningNotes.join("\n");
      }

      // Get all file attachments (from products and general)
      const fileAttachments = [
        ...selectedProducts
          .filter(p => p.file?.uploaded && p.file.s3Key)
          .map(p => ({
            fileName: p.file!.file.name,
            fileUrl: p.file!.s3Url || '',
            s3Key: p.file!.s3Key || '',
            fileSize: p.file!.file.size,
            mimeType: p.file!.file.type,
            needsGraphicDesign: p.needsGraphicDesign,
            productName: p.productName,
            validationWarnings: p.file!.validationWarnings?.map(w => w.message),
          })),
        ...generalFiles
          .filter(f => f.uploaded && f.s3Key)
          .map(f => ({
            fileName: f.file.name,
            fileUrl: f.s3Url || '',
            s3Key: f.s3Key || '',
            fileSize: f.file.size,
            mimeType: f.file.type,
          })),
      ];

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
            graphicDesignPrice: p.needsGraphicDesign ? p.graphicDesignPrice : 0,
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
    } catch (err) {
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
    setGeneralFiles([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 sticky top-0 z-40">
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

      {/* Main Content */}
      <main className="p-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">בקשת הצעת מחיר</h1>
            <p className="text-slate-500 text-sm">בחרו מוצר או תארו את הפרויקט שלכם ונחזור אליכם עם הצעה מותאמת</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                פרטי לקוח
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

            {/* Product Selection */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                הוספת מוצר
                <span className="text-xs text-slate-400 font-normal">(אופציונלי)</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {/* Category */}
                <select
                  value={selectedCategoryId || ""}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null);
                    setSelectedProductId(null);
                    setSelectedSizeId(null);
                    setSelectedQuantityId(null);
                  }}
                  className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">קטגוריה</option>
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
                  className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">מוצר</option>
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
                  className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">גודל</option>
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
                  className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">כמות</option>
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
                  className="h-9"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  הוסף
                </Button>
              </div>
            </div>

            {/* Selected Products with File Upload */}
            {selectedProducts.length > 0 && (
              <div className="space-y-3">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      {/* Product Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">{product.productName}</span>
                          <span className="text-xs text-slate-500">
                            {product.sizeName} • {product.quantity} יח' • ₪{product.price.toLocaleString()}
                          </span>
                          {product.needsGraphicDesign && product.graphicDesignPrice > 0 && (
                            <span className="text-xs text-purple-600 font-medium">
                              + גרפיקה ₪{product.graphicDesignPrice}
                            </span>
                          )}
                        </div>

                        {/* File Upload for this product */}
                        {!product.file ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept={ALLOWED_EXTENSIONS.join(',')}
                              onChange={(e) => handleProductFileUpload(product.id, e)}
                              className="hidden"
                              id={`file-${product.id}`}
                            />
                            <label 
                              htmlFor={`file-${product.id}`}
                              className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs"
                            >
                              <Upload className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-slate-500">העלה קובץ למוצר זה</span>
                            </label>
                          </div>
                        ) : (
                          <div className={`p-2 rounded-lg text-xs ${
                            product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign
                              ? 'bg-red-50 border border-red-200'
                              : product.file.validationWarnings && product.file.validationWarnings.length > 0
                                ? 'bg-orange-50 border border-orange-200'
                                : 'bg-green-50 border border-green-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {product.file.preview ? (
                                <img src={product.file.preview} alt="" className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                                  {getFileIcon(product.file.file)}
                                </div>
                              )}
                              <span className="flex-1 truncate">{product.file.file.name}</span>
                              {product.file.uploading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                              {product.file.uploaded && !product.file.validationErrors?.length && (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              {product.file.validationWarnings && product.file.validationWarnings.length > 0 && !product.file.validationErrors?.length && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                              <button 
                                type="button" 
                                onClick={() => removeProductFile(product.id)} 
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                <X className="h-3 w-3 text-slate-500" />
                              </button>
                            </div>

                            {/* Validation Errors */}
                            {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                              <div className="mt-2 space-y-1">
                                {product.file.validationErrors.map((err, i) => (
                                  <p key={i} className="text-red-600 text-[11px]">
                                    ❌ {err.message} {err.details && `- ${err.details}`}
                                  </p>
                                ))}
                                {product.graphicDesignPrice > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleProductGraphicDesign(product.id)}
                                    className="flex items-center gap-1 mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-[11px] hover:bg-purple-200"
                                  >
                                    <Palette className="h-3.5 w-3.5" />
                                    אנחנו נעשה לך גרפיקה (₪{product.graphicDesignPrice})
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Validation Warnings */}
                            {product.file.validationWarnings && product.file.validationWarnings.length > 0 && !product.file.validationErrors?.length && (
                              <div className="mt-2">
                                {product.file.validationWarnings.map((warn, i) => (
                                  <p key={i} className="text-orange-600 text-[11px]">
                                    ⚠️ {warn.message} {warn.details && `- ${warn.details}`}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Graphic Design Selected */}
                            {product.needsGraphicDesign && (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-purple-600 text-[11px] flex items-center gap-1">
                                  <Palette className="h-3.5 w-3.5" />
                                  נבחר עיצוב גרפי (₪{product.graphicDesignPrice})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleProductGraphicDesign(product.id)}
                                  className="text-[11px] text-slate-500 hover:text-red-500"
                                >
                                  ביטול
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Remove Product */}
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">סה"כ משוער:</span>
                    <span className="text-lg font-bold text-blue-600">₪{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* General Files & Description (for quote without products) */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" />
                קבצים ותיאור נוספים
                {selectedProducts.length === 0 && (
                  <span className="text-xs text-slate-400 font-normal">(חובה אם לא נבחרו מוצרים)</span>
                )}
              </h3>

              {/* General File Upload */}
              <input
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleGeneralFileUpload}
                className="hidden"
                id="general-file-upload"
              />
              <label 
                htmlFor="general-file-upload" 
                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-sm mb-2"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-slate-500">לחצו להעלאת קבצים נוספים</span>
              </label>
              <p className="text-[10px] text-slate-400 text-center mb-3">
                PDF, JPG, PNG, AI, EPS, PSD (עד 100MB)
              </p>

              {/* Uploaded General Files */}
              {generalFiles.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {generalFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-6 h-6 object-cover rounded" />
                      ) : (
                        <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                          {getFileIcon(f.file)}
                        </div>
                      )}
                      <span className="flex-1 truncate">{f.file.name}</span>
                      {f.uploading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      {f.uploaded && <Check className="h-3 w-3 text-green-500" />}
                      <button type="button" onClick={() => removeGeneralFile(f.id)} className="p-0.5 hover:bg-slate-200 rounded">
                        <X className="h-3 w-3 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <label className="text-xs text-slate-600 mb-1 block">
                תיאור הפרויקט
                {selectedProducts.length === 0 && generalFiles.length > 0 && (
                  <span className="text-red-500 mr-1">*</span>
                )}
              </label>
              <textarea
                placeholder="כמות, גודל, צבעים, גימור מיוחד..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
              disabled={submitLoading || !customerName || !customerPhone || !customerEmail || hasUnresolvedErrors}
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
                    : "בחרו מוצרים או העלו קבצים"
              }
            </p>
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
                required
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginLoading}
              >
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחבר"}
              </Button>
            </form>
            <button 
              onClick={() => setShowLoginModal(false)}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700 w-full text-center"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
