import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Inbox, 
  ChevronRight, 
  ChevronDown,
  Users, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  FileText,
  UserCheck,
  XCircle,
  Loader2,
  Package,
  Image as ImageIcon,
  Video,
  File,
  X,
  Download,
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ==================== INTERFACES ====================

interface Attachment {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

interface QuoteItem {
  sizeQuantityId: number;
  quantity: number;
  addonIds: number[];
  attachment: Attachment | null;
}

interface PendingSignup {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  customerNumber: number | null;
  createdAt: Date;
  notes: string;
  itemCount: number;
  attachmentCount: number;
  attachments: Attachment[];
  quoteItems?: QuoteItem[];
  activityLogId: number | null;
}

// ==================== FILE PREVIEW MODAL ====================

function FilePreviewModal({ 
  file, 
  onClose,
  productName
}: { 
  file: Attachment | null; 
  onClose: () => void;
  productName?: string;
}) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|tiff|tif)$/i.test(file.fileName);
  const isVideo = file.mimeType?.startsWith('video/') || 
    /\.(mp4|mov|avi|webm)$/i.test(file.fileName);
  const isPdf = file.mimeType === 'application/pdf' || 
    /\.pdf$/i.test(file.fileName);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-5xl max-h-[95vh] w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center gap-3">
            {isImage && <ImageIcon className="h-5 w-5 text-blue-600" />}
            {isVideo && <Video className="h-5 w-5 text-purple-600" />}
            {isPdf && <FileText className="h-5 w-5 text-red-600" />}
            {!isImage && !isVideo && !isPdf && <File className="h-5 w-5 text-slate-600" />}
            <div>
              <p className="font-medium text-slate-900 truncate max-w-md">{file.fileName}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{formatFileSize(file.fileSize)}</span>
                {productName && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{productName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(95vh-140px)] overflow-auto bg-slate-100">
          {isImage && (
            <div className="flex items-center justify-center">
              <img 
                src={file.fileUrl} 
                alt={file.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          )}
          
          {isVideo && (
            <div className="flex items-center justify-center bg-black rounded-xl">
              <video 
                src={file.fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            </div>
          )}
          
          {isPdf && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-24 w-24 text-red-400 mb-4" />
              <p className="text-lg font-medium text-slate-700 mb-2">{file.fileName}</p>
              <p className="text-slate-500 mb-6">{formatFileSize(file.fileSize)}</p>
              <div className="flex gap-3">
                <a href={file.fileUrl} download={file.fileName}>
                  <Button variant="outline" size="lg">
                    <Download className="h-5 w-5 ml-2" />
                    הורד קובץ
                  </Button>
                </a>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700">
                    <ExternalLink className="h-5 w-5 ml-2" />
                    פתח PDF
                  </Button>
                </a>
              </div>
            </div>
          )}
          
          {!isImage && !isVideo && !isPdf && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <File className="h-20 w-20 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">לא ניתן להציג תצוגה מקדימה לקובץ זה</p>
              <a href={file.fileUrl} download={file.fileName}>
                <Button>
                  <Download className="h-4 w-4 ml-2" />
                  הורד קובץ
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {isImage && "תמונה"}
            {isVideo && "וידאו"}
            {isPdf && "מסמך PDF"}
            {!isImage && !isVideo && !isPdf && "קובץ"}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
            {!isPdf && (
              <>
                <a href={file.fileUrl} download={file.fileName}>
                  <Button variant="outline" className="border-slate-300">
                    <Download className="h-4 w-4 ml-2" />
                    הורד
                  </Button>
                </a>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="h-4 w-4 ml-2" />
                    פתח בחלון חדש
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PRODUCT ROW WITH FILE ====================

function ProductRow({ 
  item, 
  index,
  onFileClick 
}: { 
  item: QuoteItem;
  index: number;
  onFileClick: (file: Attachment, productName: string) => void;
}) {
  // Fetch product details
  const { data: sizeQuantity } = trpc.products.getSizeQuantityById.useQuery(
    { id: item.sizeQuantityId },
    { enabled: !!item.sizeQuantityId }
  );

  const productName = sizeQuantity?.productName || `מוצר ${index + 1}`;
  const sizeName = sizeQuantity?.sizeName || '';
  const quantityLabel = sizeQuantity?.quantityLabel || `${item.quantity} יח'`;

  const isImage = item.attachment?.mimeType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|tiff|tif)$/i.test(item.attachment?.fileName || '');

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium text-slate-900 truncate">{productName}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          {sizeName && <span>{sizeName}</span>}
          <span>•</span>
          <span>{quantityLabel}</span>
          {item.addonIds && item.addonIds.length > 0 && (
            <>
              <span>•</span>
              <span className="text-purple-600">{item.addonIds.length} תוספות</span>
            </>
          )}
        </div>
      </div>

      {/* File Thumbnail */}
      {item.attachment ? (
        <div 
          onClick={() => onFileClick(item.attachment!, productName)}
          className="relative w-16 h-16 rounded-lg border-2 border-slate-200 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group shrink-0"
        >
          {isImage ? (
            <img 
              src={item.attachment.fileUrl} 
              alt={item.attachment.fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              {item.attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(item.attachment.fileName) ? (
                <FileText className="h-8 w-8 text-red-500" />
              ) : item.attachment.mimeType?.startsWith('video/') ? (
                <Video className="h-8 w-8 text-purple-500" />
              ) : (
                <File className="h-8 w-8 text-slate-400" />
              )}
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ExternalLink className="h-5 w-5 text-white" />
          </div>
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 shrink-0">
          <span className="text-[10px] text-slate-400 text-center">אין קובץ</span>
        </div>
      )}
    </div>
  );
}

// ==================== EXPANDED REQUEST DETAILS ====================

function RequestDetails({ 
  request, 
  onApprove, 
  onReject,
  isApproving,
  isRejecting
}: { 
  request: PendingSignup;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<Attachment | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileClick = (file: Attachment, productName: string) => {
    setSelectedFile(file);
    setSelectedProductName(productName);
  };

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Customer Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <Users className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">שם</p>
            <p className="text-sm font-medium text-slate-900 truncate">{request.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">טלפון</p>
            <p className="text-sm font-medium text-slate-900 truncate" dir="ltr">{request.phone || '-'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">אימייל</p>
            <p className="text-sm font-medium text-slate-900 truncate" dir="ltr">{request.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500">תאריך</p>
            <p className="text-sm font-medium text-slate-900 truncate">{formatDate(request.createdAt)}</p>
          </div>
        </div>
      </div>

      {request.companyName && (
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <Building2 className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-500">חברה</p>
            <p className="text-sm font-medium text-slate-900">{request.companyName}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {request.notes && (
        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">הערות</p>
          </div>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.notes}</p>
        </div>
      )}

      {/* Products with Files */}
      {request.quoteItems && request.quoteItems.length > 0 && (
        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-slate-700">מוצרים וקבצים ({request.quoteItems.length})</p>
          </div>
          <div className="space-y-2">
            {request.quoteItems.map((item, index) => (
              <ProductRow 
                key={index} 
                item={item} 
                index={index}
                onFileClick={handleFileClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* General Attachments (not linked to products) */}
      {request.attachments && request.attachments.length > 0 && (
        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">קבצים כלליים ({request.attachments.length})</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {request.attachments.map((file, index) => {
              const isImage = file.mimeType?.startsWith('image/') || 
                /\.(jpg|jpeg|png|gif|webp|tiff|tif)$/i.test(file.fileName);
              
              return (
                <div 
                  key={index}
                  onClick={() => handleFileClick(file, 'קובץ כללי')}
                  className="relative w-16 h-16 rounded-lg border-2 border-slate-200 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  {isImage ? (
                    <img 
                      src={file.fileUrl} 
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      {file.mimeType === 'application/pdf' ? (
                        <FileText className="h-6 w-6 text-red-500" />
                      ) : file.mimeType?.startsWith('video/') ? (
                        <Video className="h-6 w-6 text-purple-500" />
                      ) : (
                        <File className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          {isRejecting ? (
            <Loader2 className="h-4 w-4 animate-spin ml-1" />
          ) : (
            <XCircle className="h-4 w-4 ml-1" />
          )}
          דחה
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 animate-spin ml-1" />
          ) : (
            <UserCheck className="h-4 w-4 ml-1" />
          )}
          אשר לקוח
        </Button>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal 
        file={selectedFile} 
        onClose={() => setSelectedFile(null)}
        productName={selectedProductName}
      />
    </div>
  );
}

// ==================== MAIN CARD COMPONENT ====================

export function NewQuoteRequestsCard() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  // Use pendingSignups instead of newQuoteRequests
  const { data: requests, isLoading, refetch } = trpc.dashboard.pendingSignups.useQuery();

  // Approve mutation
  const approveMutation = trpc.customers.approve.useMutation({
    onSuccess: () => {
      toast.success("הלקוח אושר בהצלחה!");
      setExpandedId(null);
      refetch();
      utils.dashboard.pendingSignups.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה באישור הלקוח: " + error.message);
    },
  });

  // Reject mutation
  const rejectMutation = trpc.customers.reject.useMutation({
    onSuccess: () => {
      toast.success("הבקשה נדחתה");
      setExpandedId(null);
      refetch();
      utils.dashboard.pendingSignups.invalidate();
    },
    onError: (error) => {
      toast.error("שגיאה בדחיית הבקשה: " + error.message);
    },
  });

  const handleApprove = async (customerId: number) => {
    setApprovingId(customerId);
    try {
      await approveMutation.mutateAsync({ customerId });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (customerId: number) => {
    setRejectingId(customerId);
    try {
      await rejectMutation.mutateAsync({ customerId });
    } finally {
      setRejectingId(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-cyan-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-blue-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-blue-600" />
            בקשות חדשות
          </CardTitle>
          {requests && requests.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {requests.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">אין בקשות חדשות</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div 
                key={request.id}
                className="border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
              >
                {/* Collapsed Header */}
                <div 
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(request.id)}
                >
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    {expandedId === request.id ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  
                  <span className="text-xs text-slate-400 font-mono">#{request.customerNumber || request.id}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{request.name}</span>
                      <span className="text-xs text-slate-400 truncate hidden sm:inline">
                        • {request.itemCount} מוצרים • {request.attachmentCount} קבצים • {request.email}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`w-9 h-9 rounded-full ${getAvatarColor(request.name)} flex items-center justify-center text-white text-sm font-medium shrink-0`}>
                    {getInitials(request.name)}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === request.id && (
                  <RequestDetails
                    request={request}
                    onApprove={() => handleApprove(request.id)}
                    onReject={() => handleReject(request.id)}
                    isApproving={approvingId === request.id}
                    isRejecting={rejectingId === request.id}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
