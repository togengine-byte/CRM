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
  ExternalLink
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
  activityLogId: number | null;
}

// ==================== FILE PREVIEW MODAL ====================

function FilePreviewModal({ 
  file, 
  onClose 
}: { 
  file: Attachment | null; 
  onClose: () => void;
}) {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|tiff|tif)$/i.test(file.fileName);
  const isVideo = file.mimeType?.startsWith('video/') || 
    /\.(mp4|mov|avi|webm)$/i.test(file.fileName);
  const isPdf = file.mimeType === 'application/pdf' || 
    /\.pdf$/i.test(file.fileName);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            {isImage && <ImageIcon className="h-5 w-5 text-blue-600" />}
            {isVideo && <Video className="h-5 w-5 text-purple-600" />}
            {isPdf && <FileText className="h-5 w-5 text-red-600" />}
            {!isImage && !isVideo && !isPdf && <File className="h-5 w-5 text-slate-600" />}
            <div>
              <p className="font-medium text-slate-900 truncate max-w-md">{file.fileName}</p>
              {file.fileSize > 0 && (
                <p className="text-xs text-slate-500">
                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
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
        <div className="p-4 max-h-[calc(90vh-140px)] overflow-auto">
          {isImage && (
            <div className="flex items-center justify-center bg-slate-100 rounded-xl p-4">
              <img 
                src={file.fileUrl} 
                alt={file.fileName}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
          
          {isVideo && (
            <div className="flex items-center justify-center bg-slate-900 rounded-xl p-4">
              <video 
                src={file.fileUrl}
                controls
                className="max-w-full max-h-[60vh] rounded-lg"
              />
            </div>
          )}
          
          {isPdf && (
            <div className="bg-slate-100 rounded-xl p-4 h-[60vh]">
              <iframe 
                src={file.fileUrl}
                className="w-full h-full rounded-lg border border-slate-200"
                title={file.fileName}
              />
            </div>
          )}
          
          {!isImage && !isVideo && !isPdf && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <File className="h-20 w-20 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">לא ניתן להציג תצוגה מקדימה לקובץ זה</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4 ml-2" />
              פתח בחלון חדש
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// ==================== FILE THUMBNAIL ====================

function FileThumbnail({ 
  file, 
  onClick 
}: { 
  file: Attachment; 
  onClick: () => void;
}) {
  const isImage = file.mimeType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|tiff|tif)$/i.test(file.fileName);
  const isVideo = file.mimeType?.startsWith('video/') || 
    /\.(mp4|mov|avi|webm)$/i.test(file.fileName);
  const isPdf = file.mimeType === 'application/pdf' || 
    /\.pdf$/i.test(file.fileName);

  return (
    <div 
      onClick={onClick}
      className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
    >
      {isImage ? (
        <img 
          src={file.fileUrl} 
          alt={file.fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
          {isVideo && <Video className="h-8 w-8 text-purple-500" />}
          {isPdf && <FileText className="h-8 w-8 text-red-500" />}
          {!isVideo && !isPdf && <File className="h-8 w-8 text-slate-400" />}
        </div>
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ExternalLink className="h-5 w-5 text-white" />
      </div>
      
      {/* File name tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
        <p className="text-[9px] text-white truncate text-center">{file.fileName}</p>
      </div>
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

      {/* Attachments Preview */}
      {request.attachments && request.attachments.length > 0 && (
        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-slate-700">קבצים מצורפים ({request.attachments.length})</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {request.attachments.map((file, index) => (
              <FileThumbnail 
                key={index} 
                file={file} 
                onClick={() => setSelectedFile(file)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-slate-600">{request.itemCount} מוצרים</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-slate-600">{request.attachmentCount} קבצים</span>
        </div>
      </div>

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

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Inbox className="h-4 w-4 text-amber-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">בקשות חדשות</CardTitle>
          </div>
          {requests && requests.length > 0 && (
            <Badge className="text-[10px] px-2 py-0.5 h-5 bg-amber-100 text-amber-700 border-0">
              {requests.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-center">
            <div className="text-center">
              <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">אין בקשות חדשות</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-100 overflow-hidden">
                {/* Request Header - Always Visible */}
                <div 
                  className={`flex items-center justify-between py-3 px-3 cursor-pointer transition-colors ${
                    expandedId === request.id 
                      ? 'bg-blue-50 border-b border-blue-100' 
                      : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-amber-700">
                        {request.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {request.name || 'לקוח חדש'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{request.companyName || request.email}</span>
                        {request.itemCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{request.itemCount} מוצרים</span>
                          </>
                        )}
                        {request.attachmentCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{request.attachmentCount} קבצים</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.customerNumber && (
                      <Badge className="text-[10px] bg-slate-100 text-slate-600 border-0">
                        #{request.customerNumber}
                      </Badge>
                    )}
                    {expandedId === request.id ? (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details - In Page */}
                {expandedId === request.id && (
                  <RequestDetails 
                    request={request as PendingSignup}
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
