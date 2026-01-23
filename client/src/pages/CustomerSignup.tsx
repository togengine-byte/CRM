import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface QuoteItem {
  sizeQuantityId: number;
  quantity: number;
  productName?: string;
  sizeName?: string;
}

export default function CustomerSignup() {
  const [step, setStep] = useState<"info" | "quote">("info");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
  });

  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedSizeQuantityId, setSelectedSizeQuantityId] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");

  const { data: products = [] } = trpc.products.list.useQuery({});

  const createCustomerAndQuoteMutation = trpc.customers.createWithQuote.useMutation({
    onSuccess: () => {
      toast.success("בקשתך התקבלה בהצלחה! נשלח לך מייל עם פרטים נוספים");
      setCustomerInfo({ name: "", email: "", phone: "", companyName: "", address: "" });
      setQuoteItems([]);
      setNotes("");
      setStep("info");
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בשליחת הבקשה");
    },
  });

  const handleAddItem = () => {
    if (!selectedSizeQuantityId || itemQuantity < 1) {
      toast.error("יש לבחור מוצר וכמות");
      return;
    }

    // Find the product and size info for display
    let productName = "";
    let sizeName = "";
    const allProducts = products as any[];
    for (const product of allProducts) {
      for (const size of product.sizes || []) {
        // quantities might be nested in size or in product.quantities
        const quantities = (size as any).quantities || product.quantities || [];
        const sq = quantities.find((q: any) => q.id === parseInt(selectedSizeQuantityId) || q.sizeId === size.id);
        if (sq && sq.id === parseInt(selectedSizeQuantityId)) {
          productName = product.name;
          sizeName = `${size.name} (${sq.quantity} יח')`;
          break;
        }
      }
      if (productName) break;
    }

    setQuoteItems([
      ...quoteItems,
      {
        sizeQuantityId: parseInt(selectedSizeQuantityId),
        quantity: itemQuantity,
        productName,
        sizeName,
      },
    ]);
    setSelectedSizeQuantityId("");
    setItemQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error("שם, אימייל וטלפון הם שדות חובה");
      return;
    }

    if (quoteItems.length === 0) {
      toast.error("יש להוסיף לפחות פריט אחד");
      return;
    }

    createCustomerAndQuoteMutation.mutate({
      customerInfo,
      quoteItems: quoteItems.map(item => ({
        sizeQuantityId: item.sizeQuantityId,
        quantity: item.quantity,
      })),
      notes: notes || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">בקשת הצעת מחיר</CardTitle>
          <CardDescription>
            {step === "info"
              ? "שלב 1: פרטיך האישיים"
              : "שלב 2: בחר את המוצרים שלך"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "info" ? (
            // Step 1: Customer Info
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    placeholder="שמך"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    placeholder="050-0000000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyName">שם חברה</Label>
                  <Input
                    id="companyName"
                    value={customerInfo.companyName}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        companyName: e.target.value,
                      })
                    }
                    placeholder="שם החברה שלך"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">כתובת</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, address: e.target.value })
                  }
                  placeholder="כתובת מלאה"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setStep("quote")}
                  className="flex-1"
                  size="lg"
                >
                  המשך לבחירת מוצרים
                </Button>
              </div>
            </div>
          ) : (
            // Step 2: Quote Items
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>בחר מוצרים</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={selectedSizeQuantityId} onValueChange={setSelectedSizeQuantityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מוצר וגודל" />
                    </SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((product) =>
                        (product.sizes || []).map((size: any) => {
                          const quantities = (size as any).quantities || product.quantities?.filter((q: any) => q.sizeId === size.id) || [];
                          return quantities.map((sq: any) => (
                            <SelectItem
                              key={sq.id}
                              value={sq.id.toString()}
                            >
                              {product.name} - {size.name} ({sq.quantity} יח')
                            </SelectItem>
                          ));
                        })
                      )}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) =>
                        setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      placeholder="כמות"
                    />
                    <Button
                      onClick={handleAddItem}
                      variant="outline"
                      size="icon"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {quoteItems.length > 0 && (
                <div className="space-y-2">
                  <Label>המוצרים שבחרת:</Label>
                  <div className="space-y-2">
                    {quoteItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {item.productName} - {item.sizeName}
                          </p>
                          <p className="text-sm text-gray-600">
                            כמות: {item.quantity}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveItem(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">הערות נוספות</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="כל מידע נוסף שחשוב לך..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setStep("info")}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  חזור
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createCustomerAndQuoteMutation.isPending ||
                    quoteItems.length === 0
                  }
                  className="flex-1"
                  size="lg"
                >
                  {createCustomerAndQuoteMutation.isPending
                    ? "שולח..."
                    : "שלח בקשה"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
