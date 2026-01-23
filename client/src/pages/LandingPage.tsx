import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
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

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, loading: authLoading, refresh } = useAuthContext();
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [description, setDescription] = useState("");
  
  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  // Loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
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

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerPhone || !description) {
      toast.error("נא למלא שם, טלפון ותיאור הבקשה");
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', customerName);
      formData.append('email', customerEmail);
      formData.append('phone', customerPhone);
      formData.append('companyName', customerCompany);
      formData.append('description', description);
      
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

      setSubmitted(true);
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
              ספרו לנו מה אתם צריכים
            </h1>
            <p className="text-slate-500 text-lg">
              תארו את הפרויקט שלכם ונחזור אליכם עם הצעת מחיר מותאמת
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Description - Main field */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <label className="block text-lg font-semibold text-slate-800 mb-3">
                <FileText className="inline-block h-5 w-5 ml-2 text-blue-600" />
                מה תרצו להדפיס?
              </label>
              <textarea
                placeholder="תארו את הפרויקט שלכם... לדוגמה: 500 כרטיסי ביקור דו צדדיים, נייר 350 גרם עם למינציה מט"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg"
                required
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
                className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              >
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="text-slate-500">לחצו להעלאת קבצים או גררו לכאן</span>
              </label>
              <p className="text-xs text-slate-400 mt-2 text-center">
                PDF, JPG, PNG, AI, EPS, PSD (עד 100MB לקובץ)
              </p>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                          <File className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <span className="flex-1 text-sm truncate font-medium">{f.file.name}</span>
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

            {/* Submit button */}
            <Button 
              type="submit"
              disabled={submitLoading || !customerName || !customerPhone || !description}
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
