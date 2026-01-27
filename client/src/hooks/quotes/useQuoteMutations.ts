import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { QuoteStatus } from "@/types/quotes";

interface UseQuoteMutationsOptions {
  onQuoteCreated?: () => void;
  onStatusUpdated?: () => void;
  onPricingUpdated?: () => void;
}

/**
 * Hook for managing all quote-related mutations
 * Centralizes mutation logic and provides consistent error handling
 */
export function useQuoteMutations(options: UseQuoteMutationsOptions = {}) {
  const utils = trpc.useUtils();

  // Helper to invalidate quote data
  const invalidateQuotes = async () => {
    await utils.quotes.list.invalidate();
    await utils.quotes.getById.invalidate();
  };

  // Create quote mutation
  const createMutation = trpc.quotes.request.useMutation({
    onSuccess: () => {
      toast.success("הצעת מחיר נוצרה בהצלחה");
      invalidateQuotes();
      options.onQuoteCreated?.();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת הצעת מחיר: ${error.message}`);
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("סטטוס ההצעה עודכן");
      invalidateQuotes();
      options.onStatusUpdated?.();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הסטטוס: ${error.message}`);
    },
  });

  // Reject quote mutation
  const rejectMutation = trpc.quotes.reject.useMutation({
    onSuccess: () => {
      toast.success("ההצעה נדחת");
      invalidateQuotes();
      options.onStatusUpdated?.();
    },
    onError: (error) => {
      toast.error(`שגיאה בדחיית ההצעה: ${error.message}`);
    },
  });

  // Create revision mutation
  const reviseMutation = trpc.quotes.revise.useMutation({
    onSuccess: () => {
      toast.success("גרסה חדשה נוצרה");
      invalidateQuotes();
    },
    onError: (error) => {
      toast.error(`שגיאה ביצירת גרסה חדשה: ${error.message}`);
    },
  });

  // Cancel supplier mutation
  const cancelSupplierMutation = trpc.suppliers.cancelJobsByQuote.useMutation({
    onSuccess: () => {
      toast.success("הספק בוטל בהצלחה - ההצעה חזרה לממתין לספק");
      invalidateQuotes();
    },
    onError: (error) => {
      toast.error(`שגיאה בביטול הספק: ${error.message}`);
    },
  });

  // Auto production toggle mutation
  const setAutoProductionMutation = trpc.quotes.setAutoProduction.useMutation({
    onSuccess: (data) => {
      toast.success(data.autoProduction 
        ? "העברה אוטומטית לייצור הופעלה" 
        : "העברה אוטומטית לייצור כבויה"
      );
      invalidateQuotes();
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון הגדרה: ${error.message}`);
    },
  });

  // Helper functions
  const updateStatus = (quoteId: number, status: QuoteStatus, rejectReason?: string) => {
    if (status === "rejected" && rejectReason) {
      rejectMutation.mutate({ quoteId, reason: rejectReason });
    } else {
      updateStatusMutation.mutate({ quoteId, status });
    }
  };

  const createRevision = (quoteId: number) => {
    reviseMutation.mutate({ quoteId });
  };

  const cancelSupplier = (quoteId: number, reason: string) => {
    cancelSupplierMutation.mutate({ quoteId, reason });
  };

  const toggleAutoProduction = (quoteId: number, enabled: boolean) => {
    setAutoProductionMutation.mutate({ quoteId, autoProduction: enabled });
  };

  return {
    // Mutations
    createMutation,
    updateStatusMutation,
    rejectMutation,
    reviseMutation,
    cancelSupplierMutation,
    setAutoProductionMutation,
    
    // Helper functions
    updateStatus,
    createRevision,
    cancelSupplier,
    toggleAutoProduction,
    invalidateQuotes,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending || rejectMutation.isPending,
    isRevising: reviseMutation.isPending,
    isCancellingSupplier: cancelSupplierMutation.isPending,
  };
}
