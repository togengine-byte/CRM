import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Price {
  id: number;
  price: string;
  deliveryDays: number | null;
  updatedAt: Date;
  sizeQuantityId: number;
  quantity: number;
  sizeName: string;
  dimensions: string | null;
  productName: string;
  productId: number;
}

interface SizeQuantity {
  id: number;
  quantity: number;
  price: string;
  sizeName: string;
  dimensions: string | null;
  sizeId: number;
  productName: string;
  productId: number;
  hasPrice: boolean;
}

interface Supplier {
  id: number;
  name: string;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  status: string;
}

// Supplier Selection Screen for Admin
function SupplierSelector({ onSelect }: { onSelect: (supplier: Supplier) => void }) {
  const [search, setSearch] = useState("");
  const { data: suppliers = [], isLoading } = trpc.suppliers.list.useQuery({});

  const filteredSuppliers = suppliers.filter((s: Supplier) => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">פורטל ספקים - מצב צפייה</h1>
        <p className="text-slate-500">בחר ספק כדי לראות את הפורטל שלו</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חפש ספק לפי שם, אימייל או חברה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">טוען ספקים...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">לא נמצאו ספקים</div>
          ) : (
            <div className="divide-y">
              {filteredSuppliers.map((supplier: Supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onSelect(supplier)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{supplier.name}</p>
                      <p className="text-sm text-slate-500">
                        {supplier.companyName || supplier.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                      {supplier.status === 'active' ? 'פעיל' : supplier.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Supplier Portal View (what the supplier sees)
function SupplierPortalView({ supplier, onBack }: { supplier: Supplier; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Price>>({});
  const [addFormData, setAddFormData] = useState({
    sizeQuantityId: 0,
    price: 0,
    deliveryDays: 7,
  });

  const limit = 20;
  const utils = trpc.useUtils();

  // Queries - pass supplierId to filter by selected supplier
  const { data: dashboard } = trpc.supplierPortal.dashboard.useQuery(
    { supplierId: supplier.id },
    { enabled: !!supplier.id }
  );

  const { data: pricesData } = trpc.supplierPortal.prices.useQuery({
    page,
    limit,
    search: search || undefined,
    supplierId: supplier.id,
  });

  const { data: sizeQuantities = [] } = trpc.supplierPortal.availableSizeQuantities.useQuery({
    search: search || undefined,
    supplierId: supplier.id,
  });

  // Mutations
  const createPriceMutation = trpc.supplierPortal.createPrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר נוסף בהצלחה");
      utils.supplierPortal.invalidate();
      setShowAddModal(false);
      setAddFormData({
        sizeQuantityId: 0,
        price: 0,
        deliveryDays: 7,
      });
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בהוספת מחיר");
    },
  });

  const updatePriceMutation = trpc.supplierPortal.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר עודכן בהצלחה");
      utils.supplierPortal.invalidate();
      setEditingId(null);
      setEditFormData({});
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה בעדכון מחיר");
    },
  });

  const deletePriceMutation = trpc.supplierPortal.deletePrice.useMutation({
    onSuccess: () => {
      toast.success("מחיר נמחק בהצלחה");
      utils.supplierPortal.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "שגיאה במחיקת מחיר");
    },
  });

  const handleEditStart = (price: Price) => {
    setEditingId(price.id);
    setEditFormData(price);
  };

  const handleEditSave = () => {
    if (editingId) {
      updatePriceMutation.mutate({
        id: editingId,
        price: editFormData.price ? parseFloat(editFormData.price as any) : undefined,
        deliveryDays: editFormData.deliveryDays || undefined,
      });
    }
  };

  const handleAddPrice = () => {
    if (addFormData.sizeQuantityId > 0) {
      createPriceMutation.mutate({
        ...addFormData,
        supplierId: supplier.id,
      });
    } else {
      toast.error("יש לבחור מוצר וגודל");
    }
  };

  const availableSizeQuantities = sizeQuantities.filter((sq: SizeQuantity) => !sq.hasPrice);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowRight className="h-4 w-4 ml-1" />
            חזרה לרשימה
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">פורטל ספקים</h1>
            <p className="text-sm text-slate-500">
              צופה כ: <span className="font-medium text-blue-600">{supplier.name}</span>
              {supplier.companyName && ` (${supplier.companyName})`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          הוסף מחיר
        </button>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">סה"כ מוצרים</p>
            <p className="text-2xl font-bold">{dashboard.totalProducts}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">רישומים פעילים</p>
            <p className="text-2xl font-bold">{dashboard.activeListings}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">טווח מחירים</p>
            <p className="text-lg font-bold">
              ₪{Number(dashboard.priceRange.min).toFixed(2)} - ₪
              {Number(dashboard.priceRange.max).toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">עדכון אחרון</p>
            <p className="text-sm font-bold">
              {dashboard.lastUpdated
                ? new Date(dashboard.lastUpdated).toLocaleDateString('he-IL')
                : "לא עודכן"}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="חיפוש לפי שם מוצר או גודל..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Prices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  מוצר
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  גודל
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  כמות
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  מחיר
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  ימי אספקה
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  עודכן
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pricesData?.data.map((price: Price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{price.productName}</td>
                  <td className="px-6 py-4 text-sm">{price.sizeName}</td>
                  <td className="px-6 py-4 text-sm">{price.quantity} יח'</td>
                  <td className="px-6 py-4 text-sm">
                    {editingId === price.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.price || 0}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            price: e.target.value as any,
                          })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      `₪${Number(price.price).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingId === price.id ? (
                      <input
                        type="number"
                        value={editFormData.deliveryDays || 0}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            deliveryDays: parseInt(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      `${price.deliveryDays} ימים`
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(price.updatedAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {editingId === price.id ? (
                      <>
                        <button
                          onClick={handleEditSave}
                          disabled={updatePriceMutation.isPending}
                          className="text-green-600 hover:text-green-800 font-semibold disabled:opacity-50 ml-2"
                        >
                          שמור
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          ביטול
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(price)}
                          className="text-blue-600 hover:text-blue-800 ml-2"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("האם אתה בטוח שברצונך למחוק מחיר זה?")) {
                              deletePriceMutation.mutate({ id: price.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {(!pricesData?.data || pricesData.data.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    אין מחירים להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pricesData && pricesData.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              הקודם
            </button>
            <span className="text-sm text-gray-600">
              עמוד {page} מתוך {pricesData.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pricesData.totalPages, page + 1))}
              disabled={page === pricesData.totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              הבא
            </button>
          </div>
        )}
      </div>

      {/* Add Price Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">הוסף מחיר חדש</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מוצר וגודל
                </label>
                <select
                  value={addFormData.sizeQuantityId}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      sizeQuantityId: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>בחר מוצר וגודל...</option>
                  {availableSizeQuantities.map((sq: SizeQuantity) => (
                    <option key={sq.id} value={sq.id}>
                      {sq.productName} - {sq.sizeName} ({sq.quantity} יח')
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מחיר (₪)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={addFormData.price}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ימי אספקה
                </label>
                <input
                  type="number"
                  value={addFormData.deliveryDays}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      deliveryDays: parseInt(e.target.value) || 7,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleAddPrice}
                disabled={createPriceMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createPriceMutation.isPending ? "מוסיף..." : "הוסף"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function SupplierPortal() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { data: user } = trpc.auth.me.useQuery();

  // Check if user is admin/employee - show supplier selector
  const isAdminOrEmployee = user?.role === "admin" || user?.role === "employee";

  return (
    <DashboardLayout>
      {isAdminOrEmployee && !selectedSupplier ? (
        <SupplierSelector onSelect={setSelectedSupplier} />
      ) : selectedSupplier ? (
        <SupplierPortalView 
          supplier={selectedSupplier} 
          onBack={() => setSelectedSupplier(null)} 
        />
      ) : (
        // For actual suppliers - show their own portal directly
        <SupplierPortalView 
          supplier={{ id: user?.id || 0, name: user?.name || '', email: user?.email || '', status: 'active' }} 
          onBack={() => {}} 
        />
      )}
    </DashboardLayout>
  );
}
