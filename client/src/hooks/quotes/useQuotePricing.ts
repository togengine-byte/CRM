import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { EditedPrice } from "@/types/quotes";

interface UseQuotePricingOptions {
  quoteId?: number | null;
  onPricingSent?: () => void;
}

/**
 * Hook for managing quote pricing logic
 * Handles pricelist selection, price editing, and sending to customer
 */
export function useQuotePricing(options: UseQuotePricingOptions = {}) {
  const { quoteId, onPricingSent } = options;
  const utils = trpc.useUtils();

  // State
  const [pricingData, setPricingData] = useState<any>(null);
  const [selectedPricelistId, setSelectedPricelistId] = useState<number | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<number, EditedPrice>>({});

  // Queries
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const { data: defaultPricelist } = trpc.quotePricing.getDefaultPricelist.useQuery();

  // Set default pricelist when loaded
  useEffect(() => {
    if (defaultPricelist && !selectedPricelistId) {
      setSelectedPricelistId(defaultPricelist.id);
    }
  }, [defaultPricelist, selectedPricelistId]);

  // Mutations
  const autoPopulateMutation = trpc.quotePricing.autoPopulate.useMutation({
    onSuccess: (data) => {
      setPricingData(data);
      setSelectedPricelistId(data.pricelist?.id || null);
      setEditedPrices({});
      toast.success("מחירים נטענו אוטומטית");
    },
    onError: (error) => {
      toast.error(`שגיאה בטעינת מחירים: ${error.message}`);
    },
  });

  const changePricelistMutation = trpc.quotePricing.changePricelist.useMutation({
    onSuccess: (data) => {
      toast.success(`מחירון שונה ל-${data.pricelist.name}`);
      setPricingData(data);
      utils.quotes.list.invalidate();
      utils.quotes.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`שגיאה בשינוי מחירון: ${error.message}`);
    },
  });

  const updateItemMutation = trpc.quotePricing.updateItem.useMutation({
    onSuccess: () => {
      if (quoteId) {
        autoPopulateMutation.mutate({ quoteId });
      }
    },
    onError: (error) => {
      toast.error(`שגיאה בעדכון מחיר: ${error.message}`);
    },
  });

  const sendToCustomerMutation = trpc.quotePricing.sendToCustomer.useMutation({
    onSuccess: () => {
      toast.success("הצעה נשלחה ללקוח בהצלחה");
      setPricingData(null);
      utils.quotes.list.invalidate();
      onPricingSent?.();
    },
    onError: (error) => {
      toast.error(`שגיאה בשליחת ההצעה: ${error.message}`);
    },
  });

  // Helper functions
  const loadPricing = (quoteId: number) => {
    setEditedPrices({});
    autoPopulateMutation.mutate({ quoteId });
  };

  const changePricelist = (pricelistId: number) => {
    setSelectedPricelistId(pricelistId);
    if (quoteId) {
      changePricelistMutation.mutate({ quoteId, pricelistId });
    }
  };

  const editPrice = (itemId: number, newPrice: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [itemId]: { customerPrice: newPrice, isManual: true }
    }));
  };

  const savePrice = (itemId: number) => {
    const edited = editedPrices[itemId];
    if (edited) {
      updateItemMutation.mutate({
        itemId,
        customerPrice: edited.customerPrice,
        isManualPrice: true,
      }, {
        onSuccess: () => {
          toast.success("מחיר נשמר בהצלחה");
          utils.quotes.list.invalidate();
          utils.quotes.getById.invalidate();
          setEditedPrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[itemId];
            return newPrices;
          });
        }
      });
    }
  };

  const resetPrice = (itemId: number) => {
    updateItemMutation.mutate({
      itemId,
      isManualPrice: false,
    }, {
      onSuccess: () => {
        toast.success("מחיר הוחזר לאוטומטי");
        utils.quotes.list.invalidate();
        utils.quotes.getById.invalidate();
        setEditedPrices(prev => {
          const newPrices = { ...prev };
          delete newPrices[itemId];
          return newPrices;
        });
      }
    });
  };

  const sendToCustomer = () => {
    if (quoteId) {
      sendToCustomerMutation.mutate({ quoteId });
    }
  };

  const clearPricingData = () => {
    setPricingData(null);
    setEditedPrices({});
  };

  const setSelectedPricelistFromQuote = (pricelistId: number | null) => {
    if (pricelistId) {
      setSelectedPricelistId(pricelistId);
    } else if (defaultPricelist) {
      setSelectedPricelistId(defaultPricelist.id);
    }
  };

  return {
    // State
    pricingData,
    selectedPricelistId,
    editedPrices,
    pricelists,
    defaultPricelist,
    
    // Setters
    setSelectedPricelistId,
    setSelectedPricelistFromQuote,
    
    // Functions
    loadPricing,
    changePricelist,
    editPrice,
    savePrice,
    resetPrice,
    sendToCustomer,
    clearPricingData,
    
    // Loading states
    isLoadingPricing: autoPopulateMutation.isPending,
    isChangingPricelist: changePricelistMutation.isPending,
    isUpdatingPrice: updateItemMutation.isPending,
    isSendingToCustomer: sendToCustomerMutation.isPending,
  };
}
