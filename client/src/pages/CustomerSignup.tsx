import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  User, 
  Package, 
  Send,
  X,
  Image,
  File,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteItem {
  sizeQuantityId: number;
  quantity: number;
  productName?: string;
  sizeName?: string;
  price?: number;
}

interface UploadedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  s3Key?: string;
  s3Url?: string;
}

export default function CustomerSignup() {
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
  });

  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [selectedQuantityId, setSelectedQuantityId] = useState<string>("");
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: categories = [] } = trpc.products.getCategories.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery(
    selectedCategoryId ? { categoryId: parseInt(selectedCategoryId) } : {}
  );
  const { data: sizes = [] } = trpc.products.getSizes.useQuery(
    { productId: parseInt(selectedProductId) },
    { enabled: !!selectedProductId }
  );
  const { data: quantities = [] } = trpc.products.getSizeQuantities.useQuery(
    { sizeId: parseInt(selectedSizeId) },
    { enabled: !!selectedSizeId }
  );

  const createCustomerAndQuoteMutation = trpc.customers.createWithQuote.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "בקשתך התקבלה בהצלחה!");
      setCustomerInfo({ name: "", email: "", phone: "", companyName: "", address: "" });
      setQuoteItems([]);
      setNotes("");
      setUploadedFiles([]);
      resetProductSelection();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בשליחת הבקשה");
    },
  });

  const createQuoteWithFilesOnlyMutation = trpc.customers.createQuoteWithFilesOnly.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "בקשתך התקבלה בהצלחה!");
      setCustomerInfo({ name: "", email: "", phone: "", companyName: "", address: "" });
      setQuoteItems([]);
      setNotes("");
      setUploadedFiles([]);
      resetProductSelection();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בשליחת הבקשה");
    },
  });

  const resetProductSelection = () => {
    setSelectedCategoryId("");
    setSelectedProductId("");
    setSelectedSizeId("");
    setSelectedQuantityId("");
    setCustomQuantity(1);
  };

  // Get selected product info
  const selectedProduct = products.find((p: any) => p.id === parseInt(selectedProductId));
  const selectedSize = sizes.find((s: any) => s.id === parseInt(selectedSizeId));
  const selectedQuantityOption = quantities.find((q: any) => q.id === parseInt(selectedQuantityId));

  const handleAddItem = () => {
    if (!selectedSizeId) {
      toast.error("יש לבחור מוצר וגודל");
      return;
    }

    const quantity = selectedQuantityId 
      ? (selectedQuantityOption?.quantity || customQuantity)
      : customQuantity;

    const price = selectedQuantityOption?.price 
      ? parseFloat(selectedQuantityOption.price) 
      : undefined;

    const newItem: QuoteItem = {
      sizeQuantityId: selectedQuantityId ? parseInt(selectedQuantityId) : 0,
      quantity,
      productName: selectedProduct?.name || "",
      sizeName: selectedSize?.name || "",
      price,
    };

    // If no sizeQuantityId, we'll need to handle this differently
    if (!selectedQuantityId && selectedSizeId) {
      // Use the first available quantity or create a custom one
      const firstQuantity = quantities[0];
      if (firstQuantity) {
        newItem.sizeQuantityId = firstQuantity.id;
        newItem.quantity = customQuantity;
      }
    }

    if (newItem.sizeQuantityId) {
      setQuoteItems([...quoteItems, newItem]);
      resetProductSelection();
    } else {
      toast.error("יש לבחור כמות מהרשימה");
    }
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 
                          'application/postscript', 'image/vnd.adobe.photoshop',
                          'application/illustrator', 'application/x-photoshop'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`הקובץ ${file.name} גדול מדי (מקסימום 100MB)`);
        return false;
      }
      // Allow common design file extensions
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'ai', 'eps', 'psd'];
      if (!allowedExtensions.includes(ext || '')) {
        toast.error(`סוג הקובץ ${file.name} אינו נתמך`);
        return false;
      }
      return true;
    });

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files to S3
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = uploadedFiles.length + i;
      await uploadFileToS3(newFiles[i], fileIndex);
    }
  };

  const uploadFileToS3 = async (uploadedFile: UploadedFile, index: number) => {
    setUploadedFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, uploading: true } : f
    ));

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

      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          uploading: false, 
          uploaded: true,
          s3Key: result.key,
          s3Url: result.url,
        } : f
      ));
    } catch (error) {
      toast.error(`שגיאה בהעלאת ${uploadedFile.file.name}`);
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploading: false } : f
      ));
    }
  };

  const handleRemoveFile = (index: number) => {
    const file = uploadedFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validate customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error("שם, אימייל וטלפון הם שדות חובה");
      return;
    }

    // Check if we have items OR (files + description)
    const hasItems = quoteItems.length > 0;
    const hasFilesWithDescription = uploadedFiles.length > 0 && notes.trim().length > 0;

    if (!hasItems && !hasFilesWithDescription) {
      toast.error("יש להוסיף מוצרים או להעלות קבצים עם תיאור");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get uploaded file info
      const fileAttachments = uploadedFiles
        .filter(f => f.uploaded && f.s3Key)
        .map(f => ({
          fileName: f.file.name,
          fileUrl: f.s3Url || '',
          s3Key: f.s3Key || '',
          fileSize: f.file.size,
          mimeType: f.file.type,
        }));

      if (hasItems) {
        // Submit with products
        await createCustomerAndQuoteMutation.mutateAsync({
          customerInfo,
          quoteItems: quoteItems.map(item => ({
            sizeQuantityId: item.sizeQuantityId,
            quantity: item.quantity,
          })),
          notes: notes || undefined,
          attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        });
      } else {
        // Submit with files only
        await createQuoteWithFilesOnlyMutation.mutateAsync({
          customerInfo,
          description: notes,
          attachments: fileAttachments,
        });
      }
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const canSubmit = () => {
    const hasCustomerInfo = customerInfo.name && customerInfo.email && customerInfo.phone;
    const hasItems = quoteItems.length > 0;
    const hasFilesWithDescription = uploadedFiles.some(f => f.uploaded) && notes.trim().length > 0;
    const allFilesUploaded = uploadedFiles.every(f => !f.uploading);
    
    return hasCustomerInfo && (hasItems || hasFilesWithDescription) && allFilesUploaded && !isSubmitting;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <span className="text-xl font-bold">QF</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">QuoteFlow</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-700">בקשת הצעת מחיר</h2>
          <p className="text-gray-500 mt-1">בחרו מוצר או תארו את הפרויקט שלכם ונחזור אליכם עם הצעה מותאמת</p>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Column 1: Customer Info */}
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                פרטי לקוח
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm">שם מלא *</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="שמך"
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="email@example.com"
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-sm">טלפון *</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="050-0000000"
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName" className="text-sm">שם חברה</Label>
                <Input
                  id="companyName"
                  value={customerInfo.companyName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, companyName: e.target.value })}
                  placeholder="שם החברה"
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address" className="text-sm">כתובת</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  placeholder="כתובת מלאה"
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Column 2: Product Selection */}
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                בחירת מוצר
                <span className="text-xs text-gray-400 font-normal">(אופציונלי)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Category Selection */}
              <div className="grid gap-2">
                <Label className="text-sm">קטגוריה</Label>
                <Select value={selectedCategoryId} onValueChange={(val) => {
                  setSelectedCategoryId(val);
                  setSelectedProductId("");
                  setSelectedSizeId("");
                  setSelectedQuantityId("");
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories as any[]).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selection */}
              <div className="grid gap-2">
                <Label className="text-sm">מוצר</Label>
                <Select 
                  value={selectedProductId} 
                  onValueChange={(val) => {
                    setSelectedProductId(val);
                    setSelectedSizeId("");
                    setSelectedQuantityId("");
                  }}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="בחר מוצר" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products as any[]).map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size Selection */}
              <div className="grid gap-2">
                <Label className="text-sm">גודל</Label>
                <Select 
                  value={selectedSizeId} 
                  onValueChange={(val) => {
                    setSelectedSizeId(val);
                    setSelectedQuantityId("");
                  }}
                  disabled={!selectedProductId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="בחר גודל" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sizes as any[]).map((size) => (
                      <SelectItem key={size.id} value={size.id.toString()}>
                        {size.name} {size.dimensions && `(${size.dimensions})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Selection */}
              <div className="grid gap-2">
                <Label className="text-sm">כמות</Label>
                <Select 
                  value={selectedQuantityId} 
                  onValueChange={setSelectedQuantityId}
                  disabled={!selectedSizeId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="בחר כמות" />
                  </SelectTrigger>
                  <SelectContent>
                    {(quantities as any[]).map((qty) => (
                      <SelectItem key={qty.id} value={qty.id.toString()}>
                        {qty.quantity} יח' - ₪{parseFloat(qty.price).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button */}
              <Button 
                onClick={handleAddItem} 
                disabled={!selectedSizeId || !selectedQuantityId}
                className="w-full h-9"
                variant="outline"
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף לרשימה
              </Button>

              {/* Selected Items */}
              {quoteItems.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <Label className="text-sm mb-2 block">המוצרים שנבחרו:</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {quoteItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-gray-600">
                            {item.sizeName} • {item.quantity} יח'
                            {item.price && ` • ₪${item.price.toLocaleString()}`}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveItem(index)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 mr-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 3: Files & Description */}
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-blue-600" />
                קבצים ופרטים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* File Upload Area */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">לחצו להעלאת קבצים או גררו לכאן</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, AI, EPS, PSD (עד 100MB)</p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.ai,.eps,.psd"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      {file.preview ? (
                        <img src={file.preview} alt="" className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center">
                          {getFileIcon(file.file)}
                        </div>
                      )}
                      <span className="flex-1 truncate text-xs">{file.file.name}</span>
                      {file.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      {file.uploaded && <CheckCircle className="h-4 w-4 text-green-500" />}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-sm">
                  תיאור הפרויקט
                  {quoteItems.length === 0 && uploadedFiles.length > 0 && (
                    <span className="text-red-500 mr-1">*</span>
                  )}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="תארו את הפרויקט שלכם... כמות, גודל, צבעים, גימור מיוחד וכו'"
                  rows={4}
                  className="resize-none"
                />
                {quoteItems.length === 0 && uploadedFiles.length > 0 && !notes.trim() && (
                  <p className="text-xs text-amber-600">* נדרש תיאור כשמעלים קבצים ללא בחירת מוצר</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                className="w-full h-11 text-base"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 ml-2" />
                    שלח בקשה
                  </>
                )}
              </Button>

              {/* Help Text */}
              <p className="text-xs text-gray-500 text-center">
                {quoteItems.length > 0 
                  ? `${quoteItems.length} מוצרים נבחרו`
                  : uploadedFiles.length > 0
                    ? "ניתן לשלוח עם קבצים ותיאור בלבד"
                    : "בחרו מוצרים או העלו קבצים עם תיאור"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-sm text-gray-500">
          <a href="/login" className="text-blue-600 hover:underline">התחברות</a>
          <span className="mx-2">•</span>
          <span>© QuoteFlow 2024</span>
        </div>
      </div>
    </div>
  );
}
