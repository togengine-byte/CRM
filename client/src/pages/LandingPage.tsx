import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignIn, useAuth } from "@clerk/clerk-react";
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
import { useEffect } from "react";

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
  const { isSignedIn, isLoaded } = useAuth();
  
  // Note: Clerk SignIn component handles redirect to /dashboard automatically
  // No need to redirect here - the dialog will close and user will be redirected by Clerk
  
  // Login dialog state
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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
        
        {/* Small login button for existing users - Opens Clerk SignIn */}
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <LogIn className="ml-2 h-4 w-4" />
              כניסה למשתמשים קיימים
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">התחברות למערכת</DialogTitle>
              <DialogDescription className="text-center">
                לעובדים, מנהלים, ספקים ושליחים
              </DialogDescription>
            </DialogHeader>
            
            <div className="pt-4">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 p-0",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton: "w-full",
                  },
                }}
                redirectUrl="/dashboard"
              />
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left side - Hero text */}
          <div className="space-y-8 text-center lg:text-right lg:sticky lg:top-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                קבלו הצעת מחיר
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  בדקות ספורות
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
                מערכת חכמה להשוואת מחירים מספקים מובילים. מלאו את הפרטים ונחזור אליכם עם ההצעה הטובה ביותר.
              </p>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center lg:items-start gap-2 p-4 rounded-xl bg-white/50 backdrop-blur-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Signup form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">בקשת הצעת מחיר</CardTitle>
                <CardDescription>
                  מלאו את הפרטים והעלו קבצים לקבלת הצעה מדויקת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCustomerSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <Label htmlFor="email">מייל *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="pr-10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="050-1234567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="pr-10"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">שם החברה</Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        placeholder="שם החברה (אופציונלי)"
                        value={customerForm.companyName}
                        onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">תיאור הפרויקט *</Label>
                    <Textarea
                      id="description"
                      placeholder="תארו את הפרויקט שלכם, כמויות, מידות, צבעים וכל מידע רלוונטי..."
                      value={customerForm.description}
                      onChange={(e) => setCustomerForm({ ...customerForm, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-2">
                    <Label>העלאת קבצים</Label>
                    <div className="text-xs text-gray-500 mb-2">
                      PDF, JPG, PNG, TIFF, AI, EPS, PSD (עד 100MB לקובץ, עד 10 קבצים)
                    </div>
                    
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        לחצו להעלאה או גררו קבצים לכאן
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ALLOWED_EXTENSIONS.join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Uploaded files list */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {uploadedFiles.map((uploadedFile) => (
                          <div
                            key={uploadedFile.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {uploadedFile.preview ? (
                                <img
                                  src={uploadedFile.preview}
                                  alt={uploadedFile.file.name}
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : (
                                <File className="w-8 h-8 text-gray-400" />
                              )}
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">
                                  {uploadedFile.file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(uploadedFile.file.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadedFile.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={signupLoading || !customerForm.name || !customerForm.email || !customerForm.phone || !customerForm.description}
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {signupLoading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        שולח...
                      </>
                    ) : (
                      <>
                        <FileText className="ml-2 h-5 w-5" />
                        שליחת בקשה
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
