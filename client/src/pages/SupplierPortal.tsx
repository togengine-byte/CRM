import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "../components/DashboardLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Price {
  id: number;
  price: string;
  deliveryDays: number | null;
  minimumQuantity: number | null;
  updatedAt: Date;
  variantId: number;
  variantSku: string;
  attributes: any;
  productName: string;
}

interface Variant {
  id: number;
  sku: string;
  attributes: any;
  baseProductName: string;
  baseProductId: number;
  hasPrice: boolean;
}

export default function SupplierPortal() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Price>>({});
  const [addFormData, setAddFormData] = useState({
    productVariantId: 0,
    price: 0,
    deliveryDays: 7,
    minimumQuantity: 1,
  });

  const limit = 20;
  const utils = trpc.useUtils();

  // Queries
  const { data: dashboard } = trpc.supplierPortal.dashboard.useQuery();

  const { data: pricesData } = trpc.supplierPortal.prices.useQuery({
    page,
    limit,
    search: search || undefined,
  });

  const { data: variants = [] } = trpc.supplierPortal.availableVariants.useQuery({
    search: search || undefined,
  });

  // Mutations
  const createPriceMutation = trpc.supplierPortal.createPrice.useMutation({
    onSuccess: () => {
      toast.success("Price added successfully");
      utils.supplierPortal.invalidate();
      setShowAddModal(false);
      setAddFormData({
        productVariantId: 0,
        price: 0,
        deliveryDays: 7,
        minimumQuantity: 1,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add price");
    },
  });

  const updatePriceMutation = trpc.supplierPortal.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("Price updated successfully");
      utils.supplierPortal.invalidate();
      setEditingId(null);
      setEditFormData({});
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update price");
    },
  });

  const deletePriceMutation = trpc.supplierPortal.deletePrice.useMutation({
    onSuccess: () => {
      toast.success("Price deleted successfully");
      utils.supplierPortal.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete price");
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
        price: editFormData.price ? parseFloat(editFormData.price) : undefined,
        deliveryDays: editFormData.deliveryDays || undefined,
        minimumQuantity: editFormData.minimumQuantity || undefined,
      });
    }
  };

  const handleAddPrice = () => {
    if (addFormData.productVariantId > 0) {
      createPriceMutation.mutate(addFormData);
    } else {
      toast.error("Please select a product variant");
    }
  };

  const availableVariants = variants.filter((v) => !v.hasPrice);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Supplier Portal</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Price
          </button>
        </div>

        {/* Dashboard Stats */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{dashboard.totalProducts}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Active Listings</p>
              <p className="text-2xl font-bold">{dashboard.activeListings}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Price Range</p>
              <p className="text-lg font-bold">
                ${Number(dashboard.priceRange.min).toFixed(2)} - $
                {Number(dashboard.priceRange.max).toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Last Updated</p>
              <p className="text-sm font-bold">
                {dashboard.lastUpdated
                  ? new Date(dashboard.lastUpdated).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow">
          <input
            type="text"
            placeholder="Search by product name or SKU..."
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Delivery Days
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Min Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pricesData?.data.map((price: Price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{price.productName}</td>
                    <td className="px-6 py-4 text-sm">{price.variantSku}</td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === price.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editFormData.price || 0}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              price: e.target.value,
                            })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        `$${Number(price.price).toFixed(2)}`
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
                        `${price.deliveryDays} days`
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === price.id ? (
                        <input
                          type="number"
                          value={editFormData.minimumQuantity || 0}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              minimumQuantity: parseInt(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      ) : (
                        price.minimumQuantity
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(price.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {editingId === price.id ? (
                        <>
                          <button
                            onClick={handleEditSave}
                            disabled={updatePriceMutation.isPending}
                            className="text-green-600 hover:text-green-800 font-semibold disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStart(price)}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            <Edit2 size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => deletePriceMutation.mutate({ id: price.id })}
                            disabled={deletePriceMutation.isPending}
                            className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pricesData && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, pricesData.total)} of {pricesData.total} results
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {pricesData.totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(pricesData.totalPages, page + 1))}
                  disabled={page === pricesData.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Price Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Add New Price</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product Variant
                  </label>
                  <select
                    value={addFormData.productVariantId}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        productVariantId: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>Select a variant...</option>
                    {availableVariants.map((v: Variant) => (
                      <option key={v.id} value={v.id}>
                        {v.baseProductName} - {v.sku}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addFormData.price}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Delivery Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addFormData.deliveryDays}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        deliveryDays: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Minimum Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addFormData.minimumQuantity}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        minimumQuantity: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPrice}
                    disabled={createPriceMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createPriceMutation.isPending ? "Adding..." : "Add Price"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
