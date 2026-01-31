import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Maximize2,
  Palette,
  Scissors,
  Target,
  Type,
  FileType,
  HardDrive,
  Loader2,
} from "lucide-react";

interface ValidationWarning {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string;
  currentValue: string;
  requiredValue: string;
}

interface FileValidationResultProps {
  file: File;
  productId?: number;
  categoryId?: number;
  targetWidthMm?: number;
  targetHeightMm?: number;
  onValidationComplete?: (isValid: boolean, errors: ValidationWarning[], warnings: ValidationWarning[]) => void;
}

export function FileValidationResult({
  file,
  productId,
  categoryId,
  targetWidthMm,
  targetHeightMm,
  onValidationComplete,
}: FileValidationResultProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Get image dimensions for image files
  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
      return () => URL.revokeObjectURL(img.src);
    }
  }, [file]);

  const validateMutation = trpc.fileValidation.validateMetadata.useMutation({
    onSuccess: (result) => {
      if (onValidationComplete) {
        onValidationComplete(result.isValid, result.errors, result.warnings);
      }
    },
  });

  // Trigger validation when dimensions are available
  useEffect(() => {
    if (file && (imageDimensions || !file.type.startsWith('image/'))) {
      validateMutation.mutate({
        productId,
        categoryId,
        filename: file.name,
        fileSizeMb: file.size / (1024 * 1024),
        widthPx: imageDimensions?.width,
        heightPx: imageDimensions?.height,
        targetWidthMm,
        targetHeightMm,
      });
    }
  }, [file, imageDimensions, productId, categoryId, targetWidthMm, targetHeightMm]);

  const getStatusIcon = () => {
    if (validateMutation.isPending) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (!validateMutation.data) return null;
    
    switch (validateMutation.data.status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    if (validateMutation.isPending) {
      return <Badge variant="outline">בודק...</Badge>;
    }
    if (!validateMutation.data) return null;
    
    switch (validateMutation.data.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">תקין</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">אזהרות</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">שגיאות</Badge>;
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'dpi':
        return <Maximize2 className="h-4 w-4" />;
      case 'colorspace':
        return <Palette className="h-4 w-4" />;
      case 'bleed':
        return <Scissors className="h-4 w-4" />;
      case 'cropmarks':
      case 'registrationmarks':
        return <Target className="h-4 w-4" />;
      case 'fonts':
        return <Type className="h-4 w-4" />;
      case 'format':
        return <FileType className="h-4 w-4" />;
      case 'filesize':
        return <HardDrive className="h-4 w-4" />;
      case 'aspectratio':
        return <Maximize2 className="h-4 w-4" />;
      default:
        return <FileCheck className="h-4 w-4" />;
    }
  };

  const result = validateMutation.data;
  const hasIssues = result && (result.errors.length > 0 || result.warnings.length > 0);

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
                {imageDimensions && ` • ${imageDimensions.width}×${imageDimensions.height}px`}
                {result?.calculatedDpi && ` • ${result.calculatedDpi} DPI`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {hasIssues && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {hasIssues && (
          <CollapsibleContent className="mt-3 space-y-2">
            {/* Errors */}
            {result.errors.map((error, index) => (
              <div key={`error-${index}`} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIssueIcon(error.type)}
                    <span className="font-medium text-sm text-red-800">{error.message}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{error.details}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-red-500">נוכחי: {error.currentValue}</span>
                    <span className="text-green-600">נדרש: {error.requiredValue}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Warnings */}
            {result.warnings.map((warning, index) => (
              <div key={`warning-${index}`} className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIssueIcon(warning.type)}
                    <span className="font-medium text-sm text-yellow-800">{warning.message}</span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">{warning.details}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-yellow-500">נוכחי: {warning.currentValue}</span>
                    <span className="text-green-600">מומלץ: {warning.requiredValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

// Simple validation summary component
export function FileValidationSummary({ 
  files, 
  validationResults 
}: { 
  files: File[]; 
  validationResults: Map<string, { isValid: boolean; errors: number; warnings: number }>;
}) {
  const totalFiles = files.length;
  const validFiles = Array.from(validationResults.values()).filter(r => r.isValid).length;
  const filesWithErrors = Array.from(validationResults.values()).filter(r => r.errors > 0).length;
  const filesWithWarnings = Array.from(validationResults.values()).filter(r => r.warnings > 0 && r.errors === 0).length;

  if (totalFiles === 0) return null;

  const progress = (validationResults.size / totalFiles) * 100;

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">בדיקת קבצים</span>
        <span className="text-muted-foreground">{validationResults.size}/{totalFiles}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {validFiles} תקינים
        </span>
        {filesWithWarnings > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            {filesWithWarnings} אזהרות
          </span>
        )}
        {filesWithErrors > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {filesWithErrors} שגיאות
          </span>
        )}
      </div>
    </div>
  );
}
