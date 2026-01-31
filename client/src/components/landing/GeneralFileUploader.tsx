/**
 * General File Uploader Component
 * Handles file upload for quotes without products
 */

import { Upload, X, Loader2, Check, File, FileText, Image } from "lucide-react";
import type { ProductFile } from "./types";
import { ALLOWED_EXTENSIONS } from "./types";

interface GeneralFileUploaderProps {
  files: ProductFile[];
  description: string;
  hasProducts: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (fileId: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function GeneralFileUploader({
  files,
  description,
  hasProducts,
  onFileUpload,
  onFileRemove,
  onDescriptionChange,
}: GeneralFileUploaderProps) {
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-blue-600" />
        קבצים ותיאור נוספים
        {!hasProducts && (
          <span className="text-xs text-slate-400 font-normal">(חובה אם לא נבחרו מוצרים)</span>
        )}
      </h3>

      {/* File Upload */}
      <input
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={onFileUpload}
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

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {files.map((f) => (
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
              <button type="button" onClick={() => onFileRemove(f.id)} className="p-0.5 hover:bg-slate-200 rounded">
                <X className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <label className="text-xs text-slate-600 mb-1 block">
        תיאור הפרויקט
        {!hasProducts && files.length > 0 && (
          <span className="text-red-500 mr-1">*</span>
        )}
      </label>
      <textarea
        placeholder="כמות, גודל, צבעים, גימור מיוחד..."
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
