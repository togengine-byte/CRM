import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { 
  Loader2, 
  User, 
  Phone, 
  Building2, 
  FileText,
  CheckCircle,
  Star,
  Zap,
  Shield,
  LogIn,
  Upload,
  X,
  File,
  AlertTriangle,
  Mail
} from "lucide-react";
import { toast } from "sonner";


// Allowed file types for security
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/postscript',
  'application/illustrator',
  'image/vnd.adobe.photoshop',
];

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
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Customer signup form state
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    description: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // File validation function
  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `סוג קובץ לא מורשה: ${extension}. קבצים מותרים: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `הקובץ גדול מדי (${(file.size / 1024 / 1024).toFixed(1)}MB). גודל מקסימלי: 100MB`;
    }

    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return 'שם קובץ לא תקין';
    }

    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html', '.htm'];
    const lowerName = file.name.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerName.includes(ext)) {
        return 'קובץ חשוד - לא ניתן להעלות';
      }
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
      const id = Math.random().toString(36).substr(2, 9);
      
      return {
        file,
        id,
        error: error || undefined,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    });

    newFiles.filter(f => f.error).forEach(f => {
      toast.error(`${f.file.name}: ${f.error}`);
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
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "התחברות נכשלה");
        return;
      }

      toast.success("התחברת בהצלחה!");
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    } catch (err) {
      toast.error("שגיאה בהתחברות, נסה שוב");
      console.error(err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    setShowLoginForm(true);
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', customerForm.name);
      formData.append('email', customerForm.email);
      formData.append('phone', customerForm.phone);
      formData.append('companyName', customerForm.companyName);
      formData.append('description', customerForm.description);
      
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

      setSignupSuccess(true);
      toast.success("הבקשה נשלחה בהצלחה! ניצור איתך קשר בהקדם.");
    } catch (err) {
      toast.error("שגיאה בשליחת הבקשה, נסה שוב");
      console.error(err);
    } finally {
      setSignupLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: "מהיר ויעיל", description: "קבלו הצעת מחיר תוך דקות" },
    { icon: Shield, title: "אמינות מלאה", description: "ספקים מאומתים ואיכותיים" },
    { icon: Star, title: "מחירים תחרותיים", description: "השוואת מחירים אוטומטית" },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-12 pb-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">הבקשה נשלחה בהצלחה!</h2>
              <p className="text-gray-600">
                קיבלנו את פרטיך ונציג שלנו ייצור איתך קשר בהקדם עם הצעת מחיר מותאמת אישית.
              </p>
              {uploadedFiles.length > 0 && (
                <p className="text-sm text-gray-500">
                  {uploadedFiles.length} קבצים הועלו בהצלחה ויעברו בדיקה
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSignupSuccess(false);
                setCustomerForm({ name: "", email: "", phone: "", companyName: "", description: "" });
                setUploadedFiles([]);
              }}
              className="mt-4"
            >
              שליחת בקשה נוספת
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-50" />
      </div>

      {/* Header with login button */}
      <header className="relative z-20 flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg font-bold text-white">QF</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            QuoteFlow
          </span>
        </div>
        
        {/* Login button - navigates directly to dashboard */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-600 hover:text-gray-900"
          onClick={handleGoToDashboard}
        >
          <LogIn className="ml-2 h-4 w-4" />
          כניסה למשתמשים קיימים
        </Button>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left side - Hero text */}
          <div className="space-y-8 text-center lg:text-right lg:sticky lg:top-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                קבלו הצעות מחיר
                <span className="block text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-indigo-600">
                  בקליק אחד
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
                מערכת חכמה להשוואת מחירים מספקי דפוס מובילים. חסכו זמן וכסף עם QuoteFlow.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg"
                >
                  <feature.icon className="h-8 w-8 text-blue-600 mb-2 mx-auto lg:mx-0" />
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Signup form */}
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">בקשת הצעת מחיר</CardTitle>
              <CardDescription>
                מלאו את הפרטים ונחזור אליכם עם הצעה מותאמת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomerSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="ישראל ישראלי"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="pr-10"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="050-1234567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="pr-10"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">שם החברה</Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="company"
                        placeholder="שם החברה (אופציונלי)"
                        value={customerForm.companyName}
                        onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">תיאור הפרויקט *</Label>
                  <div className="relative">
                    <FileText className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="description"
                      placeholder="תארו את הפרויקט שלכם: סוג המוצר, כמות, מידות, צבעים וכו'..."
                      value={customerForm.description}
                      onChange={(e) => setCustomerForm({ ...customerForm, description: e.target.value })}
                      className="pr-10 min-h-[100px]"
                      required
                    />
                  </div>
                </div>

                {/* File upload section */}
                <div className="space-y-2">
                  <Label>קבצים (אופציונלי)</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        לחצו להעלאת קבצים או גררו לכאן
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG, TIFF, AI, EPS, PSD (עד 100MB לקובץ)
                      </p>
                    </label>
                  </div>

                  {/* Uploaded files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {uploadedFiles.map((uploadedFile) => (
                        <div
                          key={uploadedFile.id}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                        >
                          {uploadedFile.preview ? (
                            <img
                              src={uploadedFile.preview}
                              alt={uploadedFile.file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <File className="w-10 h-10 text-gray-400 p-2 bg-gray-100 rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(uploadedFile.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={signupLoading}
                >
                  {signupLoading ? (
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
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-500 text-sm">
        <p>© 2024 QuoteFlow. כל הזכויות שמורות.</p>
      </footer>



      {/* Login Modal */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">התחברות למערכת</CardTitle>
              <CardDescription>הכנס את פרטיך כדי להתחבר</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">אימייל</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">סיסמה</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="flex-1"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      "התחברות"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLoginForm(false)}
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
