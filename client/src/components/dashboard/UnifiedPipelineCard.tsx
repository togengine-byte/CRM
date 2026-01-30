import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Activity, 
  FileText, 
  Package, 
  ChevronDown,
  MessageCircle 
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  isJobOverdue,
  getJobIssueDescription,
  getStatusLabel,
  isQuoteOverdue,
  getWhatsAppMessage,
  createWhatsAppUrl,
  UNIFIED_STAGES,
  getUnifiedStageIndex,
} from "@/utils/dashboardHelpers";

// ==================== UNIFIED PROGRESS BAR ====================

interface UnifiedProgressBarProps {
  quoteStatus?: string | null;
  jobStatus?: string | null;
  compact?: boolean;
  isOverdue?: boolean;
  currentStatusLabel?: string;
  issue?: string;
}

function UnifiedProgressBar({ 
  quoteStatus = null, 
  jobStatus = null, 
  compact = false, 
  isOverdue = false, 
  currentStatusLabel, 
  issue 
}: UnifiedProgressBarProps) {
  const currentStage = getUnifiedStageIndex(quoteStatus, jobStatus);
  
  const renderDot = (index: number, stage: typeof UNIFIED_STAGES[number]) => {
    const isCurrentStage = index === currentStage;
    const isCompleted = index < currentStage;
    
    // קביעת צבע הנקודה
    let dotColor = 'bg-slate-200';
    if (isCompleted) {
      dotColor = 'bg-emerald-500';
    } else if (isCurrentStage) {
      if (isOverdue) {
        dotColor = 'bg-red-500';
      } else if (stage.phase === 'sales') {
        dotColor = 'bg-amber-500';
      } else if (stage.phase === 'production') {
        dotColor = 'bg-blue-600';
      } else {
        dotColor = 'bg-emerald-500';
      }
    }
    
    const dot = (
      <div className={`h-2.5 w-2.5 rounded-full transition-colors ${dotColor} ${isOverdue && isCurrentStage ? 'ring-2 ring-red-200' : ''}`} />
    );
    
    // אם באיחור ובשלב הנוכחי, הוסף tooltip
    if (isOverdue && isCurrentStage) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer">
                {dot}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white text-xs p-2 max-w-[250px]">
              <div className="space-y-1">
                <p className="font-medium text-blue-300">{currentStatusLabel || stage.label}</p>
                <p className="text-red-300">{issue || 'עדיין לא נמסר'}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return dot;
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {UNIFIED_STAGES.map((stage, index) => (
          <div key={stage.key} className="flex flex-col items-center flex-1">
            {renderDot(index, stage)}
            {/* תמיד מציג את שם השלב מתחת לנקודה */}
            <span className={`text-[7px] mt-0.5 text-center leading-tight ${
              index <= currentStage 
                ? (isOverdue && index === currentStage ? 'text-red-600 font-medium' : 'text-slate-600') 
                : 'text-slate-400'
            }`}>
              {stage.shortLabel}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center">
        {UNIFIED_STAGES.slice(0, -1).map((_, index) => (
          <div key={index} className={`flex-1 h-0.5 ${
            index < currentStage ? 'bg-emerald-500' : 'bg-slate-200'
          }`} />
        ))}
      </div>
    </div>
  );
}

// ==================== PIPELINE ITEM INTERFACE ====================

interface PipelineItem {
  id: number;
  type: 'quote' | 'job';
  customerName: string;
  productName?: string;
  supplierName?: string;
  supplierId?: number;
  quoteStatus: string | null;
  jobStatus: string | null;
  totalPrice?: number;
  isOverdue: boolean;
  issue?: string;
  createdAt: Date;
}

// ==================== UNIFIED PIPELINE CARD ====================

export function UnifiedPipelineCard({ isLoading: parentLoading }: { isLoading: boolean }) {
  const { data: quotes, isLoading: quotesLoading } = trpc.quotes.list.useQuery();
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery();
  const { data: suppliers, isLoading: suppliersLoading } = trpc.suppliers.list.useQuery();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const loading = parentLoading || quotesLoading || jobsLoading || suppliersLoading;
  
  // מיפוי ספקים לפי ID לגישה מהירה לטלפון עדכני
  const suppliersMap = React.useMemo(() => {
    if (!suppliers) return new Map<number, any>();
    return new Map(suppliers.map((s: any) => [s.id, s]));
  }, [suppliers]);
  
  // מיזוג כל הפריטים לרשימה אחת
  const pipelineItems: PipelineItem[] = React.useMemo(() => {
    const items: PipelineItem[] = [];
    
    // הוספת הצעות פעילות (לא אושרו/נדחו)
    if (quotes) {
      quotes
        .filter((q: any) => ['draft', 'sent'].includes(q.status))
        .forEach((quote: any) => {
          const { overdue, issue } = isQuoteOverdue(quote);
          items.push({
            id: quote.id,
            type: 'quote',
            customerName: quote.customerName || 'לקוח לא מזוהה',
            quoteStatus: quote.status,
            jobStatus: null,
            totalPrice: quote.totalPrice,
            isOverdue: overdue,
            issue: issue,
            createdAt: new Date(quote.createdAt),
          });
        });
    }
    
    // הוספת עבודות פעילות (לא נמסרו/בוטלו)
    if (jobs) {
      jobs
        .filter((j: any) => !['delivered', 'cancelled'].includes(j.status))
        .forEach((job: any) => {
          const overdue = isJobOverdue(job);
          items.push({
            id: job.id,
            type: 'job',
            customerName: job.customerName || 'לקוח לא מזוהה',
            productName: job.productName,
            supplierName: job.supplierName,
            supplierId: job.supplierId,
            quoteStatus: 'approved', // עבודה = הצעה אושרה
            jobStatus: job.status,
            isOverdue: overdue,
            issue: overdue ? getJobIssueDescription(job) : undefined,
            createdAt: new Date(job.createdAt),
          });
        });
    }
    
    // מיון לפי תאריך יצירה (חדש קודם)
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [quotes, jobs, suppliersMap]);
  
  const overdueCount = pipelineItems.filter(item => item.isOverdue).length;
  const displayItems = isExpanded ? pipelineItems : pipelineItems.slice(0, 5);

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-medium text-slate-900">מעקב התקדמות</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 h-5 bg-red-100 text-red-700 border-0">
                {overdueCount} באיחור
              </Badge>
            )}
            {pipelineItems.length > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 h-5 bg-blue-100 text-blue-700 border-0">
                {pipelineItems.length} פעילים
              </Badge>
            )}
            {pipelineItems.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-center">
            <p className="text-xs text-slate-400">אין פריטים פעילים</p>
          </div>
        ) : (
          <div className={`space-y-2 transition-all duration-300 ${isExpanded ? 'max-h-[600px] overflow-y-auto' : ''}`}>
            {displayItems.map((item) => (
              <div 
                key={`${item.type}-${item.id}`}
                className={`p-3 rounded-lg transition-colors ${
                  item.isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === 'quote' ? (
                      <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {item.type === 'job' ? item.productName : item.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.type === 'job' ? `עבודה מס' ${item.id}` : `#${item.id}`}
                    </span>
                    {item.type === 'job' && (
                      <span className="text-[10px] text-slate-500">| {item.customerName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* כפתור WhatsApp לספק - רק בשורות אדומות (באיחור) ולא בשלב נאסף */}
                    {(() => {
                      // לקחת טלפון עדכני מטבלת הספקים (לא מהעבודה)
                      const supplier = item.supplierId ? suppliersMap.get(item.supplierId) : null;
                      const currentPhone = supplier?.phone;
                      
                      if (item.type !== 'job' || !currentPhone || !item.isOverdue || item.jobStatus === 'picked_up') {
                        return null;
                      }
                      
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={createWhatsAppUrl(
                                  currentPhone,
                                  getWhatsAppMessage(item.id, item.productName || '', item.jobStatus || '')
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-green-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              שלח הודעה לספק
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                    {item.type === 'job' && item.supplierName && (
                      <span className="text-[10px] text-slate-500 shrink-0">{item.supplierName}</span>
                    )}
                    {item.totalPrice && (
                      <span className="text-xs text-amber-600 font-medium shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    )}
                  </div>
                </div>
                <UnifiedProgressBar 
                  quoteStatus={item.quoteStatus}
                  jobStatus={item.jobStatus}
                  isOverdue={item.isOverdue}
                  currentStatusLabel={item.jobStatus ? getStatusLabel(item.jobStatus) : (item.quoteStatus === 'sent' ? 'ממתין לאישור לקוח' : 'הצעת מחיר')}
                  issue={item.issue}
                />
              </div>
            ))}
          </div>
        )}
        {pipelineItems.length > 5 && (
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-xs text-slate-500 h-7 mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'הצג פחות' : `הצג הכל (${pipelineItems.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
