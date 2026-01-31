/**
 * Product List Component
 * Displays selected products with file upload and validation per product
 */

import { 
  Upload, X, Loader2, Check, Trash2, AlertCircle, AlertTriangle, 
  Palette, File, FileText, Image, Package 
} from "lucide-react";
import type { SelectedProduct, ProductFile } from "./types";
import { ALLOWED_EXTENSIONS } from "./types";

interface ProductListProps {
  products: SelectedProduct[];
  onProductFileUpload: (productId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onProductFileRemove: (productId: string) => void;
  onProductRemove: (productId: string) => void;
  onToggleGraphicDesign: (productId: string) => void;
}

export function ProductList({
  products,
  onProductFileUpload,
  onProductFileRemove,
  onProductRemove,
  onToggleGraphicDesign,
}: ProductListProps) {
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-blue-600" />
        מוצרים שנבחרו ({products.length})
      </h3>
      
      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-start gap-3">
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm text-slate-800">{product.productName}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-600">{product.sizeName}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-600">{product.quantity} יח'</span>
                </div>

                {/* File Upload for this Product */}
                {!product.file ? (
                  <div>
                    <input
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      onChange={(e) => onProductFileUpload(product.id, e)}
                      className="hidden"
                      id={`file-upload-${product.id}`}
                    />
                    <label 
                      htmlFor={`file-upload-${product.id}`}
                      className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-500">העלה קובץ למוצר זה</span>
                    </label>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    {/* File Info */}
                    <div className="flex items-center gap-2 text-xs">
                      {product.file.preview ? (
                        <img src={product.file.preview} alt="" className="w-6 h-6 object-cover rounded" />
                      ) : (
                        <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                          {getFileIcon(product.file.file)}
                        </div>
                      )}
                      <span className="flex-1 truncate text-slate-700">{product.file.file.name}</span>
                      {product.file.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      {product.file.uploaded && !product.file.validationErrors?.length && !product.needsGraphicDesign && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {product.needsGraphicDesign && (
                        <Palette className="h-4 w-4 text-purple-500" />
                      )}
                      {product.file.validationErrors && product.file.validationErrors.length > 0 && !product.needsGraphicDesign && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {product.file.validationWarnings && product.file.validationWarnings.length > 0 && !product.file.validationErrors?.length && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <button 
                        type="button" 
                        onClick={() => onProductFileRemove(product.id)} 
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
                        <button
                          type="button"
                          onClick={() => onToggleGraphicDesign(product.id)}
                          className="flex items-center gap-1 mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-[11px] hover:bg-purple-200"
                        >
                          <Palette className="h-3.5 w-3.5" />
                          אנחנו נעשה לך גרפיקה
                        </button>
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
                          נבחר עיצוב גרפי
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleGraphicDesign(product.id)}
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
                onClick={() => onProductRemove(product.id)}
                className="p-1.5 hover:bg-red-100 rounded-lg"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}


      </div>
    </div>
  );
}
