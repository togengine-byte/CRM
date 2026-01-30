import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Inbox, 
  ChevronRight, 
  Users, 
  Mail, 
  Phone, 
  Building2, 
  Package, 
  Calendar, 
  FileText,
  Eye,
  UserCheck,
  XCircle,
  Loader2,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Award,
  Search,
  Star
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatFullDate } from "@/utils/dashboardHelpers";

// ==================== INTERFACES ====================

interface SignupRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  companyName?: string | null;
  description: string;
  productId?: number | null;
  queueNumber?: number;
  status?: string;
  files?: unknown;
  fileValidationWarnings?: unknown;
  createdAt?: string | Date;
}

interface SupplierRecommendation {
  supplierId: number;
  supplierName: string;
  companyName?: string | null;
  pricePerUnit?: number;
  rating?: number;
  deliveryDays?: number;
  reliabilityScore?: number;
  totalScore?: number;
  price?: number;
  avgRating?: number;
  avgDeliveryDays?: number;
  score?: number;
}

// ==================== SUPPLIER RECOMMENDATIONS MODAL ====================

function SupplierRecommendationsModal({ 
  isOpen, 
  onClose, 
  productId 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  productId?: number;
}) {
  const { data: recommendations, isLoading } = trpc.suppliers.enhancedRecommendations.useQuery(
    { productId: productId || 0, limit: 3 },
    { enabled: isOpen && !!productId }
  );

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { color: 'bg-emerald-50 text-emerald-700', label: 'מומלץ מאוד' };
    if (score >= 60) return { color: 'bg-blue-50 text-blue-700', label: 'מומלץ' };
    return { color: 'bg-slate-100 text-slate-600', label: 'סביר' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            ספקים מומלצים
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            הספקים המתאימים ביותר על פי מחיר, איכות ואמינות
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : !recommendations || recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">לא נמצאו ספקים מתאימים</p>
            </div>
          ) : (
            recommendations.map((supplier: SupplierRecommendation, index: number) => {
              const score = supplier.totalScore || supplier.score || 0;
              const scoreBadge = getScoreBadge(score);
              return (
                <div 
                  key={supplier.supplierId}
                  className={`p-4 rounded-lg border transition-all ${
                    index === 0 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-semibold ${
                        index === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{supplier.supplierName}</p>
                        {supplier.companyName && (
                          <p className="text-xs text-slate-500">{supplier.companyName}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${scoreBadge.color} border-0 text-xs`}>
                      {scoreBadge.label}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">מחיר</p>
                      <p className="text-sm font-semibold text-slate-900">₪{supplier.pricePerUnit || supplier.price || 0}</p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">דירוג</p>
                      <p className="text-sm font-semibold text-slate-900 flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {(supplier.rating || supplier.avgRating || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">אספקה</p>
                      <p className="text-sm font-semibold text-slate-900">{supplier.deliveryDays || supplier.avgDeliveryDays || 0} ימים</p>
                    </div>
                    <div className="p-2 rounded bg-white">
                      <p className="text-xs text-slate-500">אמינות</p>
                      <p className="text-sm font-semibold text-slate-900">{supplier.reliabilityScore || 0}%</p>
                    </div>
                  </div>
                  
                  {index === 0 && (
                    <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                      בחר ספק זה
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== PENDING SIGNUPS CARD ====================

export function PendingSignupsCard({ 
  signups, 
  isLoading, 
  onRefresh 
}: { 
  signups: SignupRequest[]; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [selectedSignup, setSelectedSignup] = useState<SignupRequest | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileValidation, setFileValidation] = useState<{warnings: string[], errors: string[]} | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const utils = trpc.useUtils();

  const approveSignupMutation = trpc.admin.approveSignupRequest.useMutation({
    onSuccess: () => {
      toast.success("הלקוח אושר והועבר לרשימת הלקוחות!");
      setSelectedSignup(null);
      onRefresh();
      utils.dashboard.pendingSignups.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה באישור הלקוח: " + error.message);
    },
  });

  const rejectSignupMutation = trpc.userManagement.signupRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("הבקשה נדחתה");
      setSelectedSignup(null);
      onRefresh();
      utils.dashboard.pendingSignups.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה בדחיית הבקשה: " + error.message);
    },
  });

  const handleApproveCustomer = async () => {
    if (!selectedSignup) return;
    setIsApproving(true);
    try {
      await approveSignupMutation.mutateAsync({ requestId: selectedSignup.id });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectCustomer = async () => {
    if (!selectedSignup) return;
    setIsRejecting(true);
    try {
      await rejectSignupMutation.mutateAsync({ id: selectedSignup.id });
    } finally {
      setIsRejecting(false);
    }
  };

  // Check if file is an image
  const isImageFile = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'].includes(ext || '');
  };

  // Open file preview with validation
  const handleFileClick = async (file: any, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(file);
    setFileValidation(null);
    
    // Run validation on the file
    if (isImageFile(file.originalName || file.name)) {
      setIsValidating(true);
      try {
        // Get file size in MB
        const fileSizeMb = file.size ? file.size / (1024 * 1024) : 0;
        const filename = file.originalName || file.name;
        const format = filename.split('.').pop()?.toLowerCase() || '';
        
        // Simple client-side validation warnings
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // Check file size
        if (fileSizeMb > 100) {
          errors.push(`קובץ גדול מדי (${fileSizeMb.toFixed(1)}MB) - מקסימום 100MB`);
        } else if (fileSizeMb > 50) {
          warnings.push(`קובץ גדול (${fileSizeMb.toFixed(1)}MB)`);
        }
        
        // Check format for print
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(format)) {
          warnings.push('פורמט לא אידיאלי להדפסה - מומלץ PDF/AI/EPS');
        }
        
        // Note about DPI - we can't check real DPI client-side
        warnings.push('יש לוודא שהרזולוציה לפחות 300 DPI להדפסה איכותית');
        
        setFileValidation({ warnings, errors });
      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setIsValidating(false);
      }
    }
  };

  return (
    <>
      <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Inbox className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-medium text-slate-900">בקשות חדשות</CardTitle>
            </div>
            {signups.length > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 h-5 bg-amber-100 text-amber-700 border-0">
                {signups.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : signups.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-center">
              <p className="text-xs text-slate-400">אין בקשות ממתינות</p>
            </div>
          ) : (
            <div className="space-y-1">
              {signups.slice(0, 5).map((signup) => (
                <div 
                  key={signup.id}
                  className="flex items-center justify-between py-2 px-2 rounded hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedSignup(signup)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium text-amber-700">
                        {signup.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{signup.name || 'לקוח חדש'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{signup.companyName || signup.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signup Details Modal */}
      <Dialog open={!!selectedSignup && !showSupplierModal} onOpenChange={() => setSelectedSignup(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">פרטי הבקשה</DialogTitle>
            <DialogDescription className="text-slate-500">
              בקשה להצעת מחיר מלקוח חדש
            </DialogDescription>
          </DialogHeader>
          
          {selectedSignup && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">שם מלא</p>
                    <p className="text-sm font-medium text-slate-900">{selectedSignup.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">אימייל</p>
                    <p className="text-sm font-medium text-slate-900" dir="ltr">{selectedSignup.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">טלפון</p>
                    <p className="text-sm font-medium text-slate-900" dir="ltr">{selectedSignup.phone}</p>
                  </div>
                </div>
                
                {selectedSignup.companyName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">שם החברה</p>
                      <p className="text-sm font-medium text-slate-900">{String(selectedSignup.companyName || '')}</p>
                    </div>
                  </div>
                )}

                {selectedSignup.productId && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600">מוצר מבוקש</p>
                      <p className="text-sm font-medium text-blue-700">מוצר {String(selectedSignup.productId || '')}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">תאריך הבקשה</p>
                    <p className="text-sm font-medium text-slate-900">{selectedSignup.createdAt ? formatFullDate(String(selectedSignup.createdAt)) : 'לא זמין'}</p>
                  </div>
                </div>
              </div>

              {/* Files */}
              {Array.isArray(selectedSignup.files) && (selectedSignup.files as any[]).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    קבצים מצורפים ({(selectedSignup.files as any[]).length})
                  </p>
                  <div className="space-y-2">
                    {(selectedSignup.files as any[]).map((file: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                        onClick={(e) => handleFileClick(file, e)}
                      >
                        <div className="flex items-center gap-3">
                          {isImageFile(file.originalName || file.name) ? (
                            <div className="h-10 w-10 rounded bg-slate-200 overflow-hidden">
                              <img 
                                src={file.url || file.path} 
                                alt="" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded bg-blue-50 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.originalName || file.name}</p>
                            <p className="text-xs text-slate-500">
                              {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                            </p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={handleApproveCustomer}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      מאשר...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 ml-2" />
                      אשר לקוח וצור הצעת מחיר
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={handleRejectCustomer}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      דוחה...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 ml-2" />
                      דחה בקשה
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Recommendations Modal */}
      <SupplierRecommendationsModal 
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        productId={selectedSignup?.productId ?? undefined}
      />

      {/* File Preview Modal */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              תצוגת קובץ
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedFile?.originalName || selectedFile?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              {/* Image Preview */}
              {isImageFile(selectedFile.originalName || selectedFile.name) ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <img 
                    src={selectedFile.url || selectedFile.path} 
                    alt={selectedFile.originalName || selectedFile.name}
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-12 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">תצוגה מקדימה לא זמינה לקובץ זה</p>
                  </div>
                </div>
              )}

              {/* Validation Results */}
              {isValidating ? (
                <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 ml-2" />
                  <span className="text-slate-600">בודק קובץ...</span>
                </div>
              ) : fileValidation && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" />
                    בדיקת איכות להדפסה
                  </p>
                  
                  {/* Errors */}
                  {fileValidation.errors.length > 0 && (
                    <div className="space-y-2">
                      {fileValidation.errors.map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          <span className="text-sm text-red-700">{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {fileValidation.warnings.length > 0 && (
                    <div className="space-y-2">
                      {fileValidation.warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <span className="text-sm text-amber-700">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {fileValidation.errors.length === 0 && fileValidation.warnings.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">הקובץ תקין להדפסה</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedFile(null)}
                >
                  סגור
                </Button>
                <a 
                  href={selectedFile.url || selectedFile.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Download className="h-4 w-4 ml-2" />
                    הורד קובץ
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
