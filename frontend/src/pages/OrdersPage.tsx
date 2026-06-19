/**
 * OrdersPage — Order management with create, status update, and delete capabilities.
 * Features: paginated table with page size selector, status filter, create order modal,
 *           inline status update, delete confirmation, error/success toast.
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";
import { ordersApi, productsApi } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { SkeletonRow } from "../components/Skeleton";
import type { Product } from "../types";

const STATUSES = ["", "pending", "in_transit", "completed", "cancelled"];
const PAGE_SIZES = [10, 20, 50];

interface OrderLineForm {
  sku: string;
  quantity: number;
}

/* ─── Toast Notification ─── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm ${
          type === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}
      >
        {type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Create Order Modal ─── */

function CreateOrderModal({
  onClose,
  onSave,
  saving,
  products,
  error,
}: {
  onClose: () => void;
  onSave: (data: { order_number: string; customer_name: string; customer_email: string; shipping_address: string; items: OrderLineForm[] }) => void;
  saving: boolean;
  products: Product[];
  error: string | null;
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems] = useState<OrderLineForm[]>([{ sku: "", quantity: 1 }]);

  const addLine = () => setItems((prev) => [...prev, { sku: "", quantity: 1 }]);
  const removeLine = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof OrderLineForm, value: string | number) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const validItems = items.filter((i) => i.sku && i.quantity > 0);
  const canSubmit = orderNumber && validItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Order</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Order Number *</label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. PO-20260619-001"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Customer Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email</label>
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Shipping Address</label>
              <input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="123 Main St, Sydney NSW 2000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Line Items *</label>
              <button onClick={addLine} className="text-xs text-[var(--color-primary)] hover:underline">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    {idx === 0 && <label className="block text-xs text-[var(--color-text-muted)] mb-1">SKU</label>}
                    <select
                      value={item.sku}
                      onChange={(e) => updateLine(idx, "sku", e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.sku} — {p.name} (${p.rrp.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    {idx === 0 && <label className="block text-xs text-[var(--color-text-muted)] mb-1">Qty</label>}
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-red-600 mb-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] sticky bottom-0 bg-[var(--color-surface)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                order_number: orderNumber,
                customer_name: customerName,
                customer_email: customerEmail,
                shipping_address: shippingAddress,
                items: validItems,
              })
            }
            disabled={saving || !canSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; order_number: string } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const extractError = useCallback((err: unknown): string => {
    const resp = (err as { response?: { data?: { detail?: string }; status?: number } })?.response;
    if (resp?.data?.detail) return resp.data.detail;
    if (resp?.status === 409) return "An order with this number already exists.";
    return "An unexpected error occurred. Please try again.";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, pageSize, status],
    queryFn: () => ordersApi.list({ page, page_size: pageSize, status }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsApi.list({ page: 1, page_size: 100 }),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (data: { order_number: string; customer_name?: string; items: { sku: string; quantity: number }[] }) =>
      ordersApi.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowCreate(false);
      setMutationError(null);
      setToast({ message: `Order ${variables.order_number} created successfully`, type: "success" });
    },
    onError: (err) => setMutationError(extractError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: string }) =>
      ordersApi.updateStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setToast({ message: "Order status updated", type: "success" });
    },
    onError: (err) => setToast({ message: extractError(err), type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDeleteTarget(null);
      setToast({ message: "Order deleted", type: "success" });
    },
    onError: (err) => {
      setDeleteTarget(null);
      setToast({ message: extractError(err), type: "error" });
    },
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Orders</h1>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace(/_/g, " ") : "All statuses"}
              </option>
            ))}
          </select>
          <button
            onClick={() => { setMutationError(null); setShowCreate(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Order
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-slate-50/60">
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Order #</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Items</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Total</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              : data?.items.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                      {status ? `No orders with status "${status.replace(/_/g, " ")}"` : "No orders yet. Click 'New Order' to create one."}
                    </td>
                  </tr>
                )
                : data?.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td
                      className="px-4 py-3 font-medium text-[var(--color-primary)] cursor-pointer hover:underline"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{o.customer_name || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({ id: o.id, newStatus: e.target.value });
                        }}
                        className="text-xs rounded-md border border-transparent hover:border-[var(--color-border)] bg-transparent px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                      >
                        {STATUSES.filter((s) => s).map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">{o.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                      ${o.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: o.id, order_number: o.order_number });
                        }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete order"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination — always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-slate-50/30">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">
              {data ? `${data.total} order${data.total !== 1 ? "s" : ""}` : "—"}
              {data && data.total_pages > 1 && ` · Page ${data.page} of ${data.total_pages}`}
            </span>
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-xs bg-white"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span>per page</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!data || page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={!data || page >= (data?.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => { setShowCreate(false); setMutationError(null); }}
          onSave={(data) => { setMutationError(null); createMutation.mutate(data); }}
          saving={createMutation.isPending}
          products={productsData?.items ?? []}
          error={mutationError}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Delete Order</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">
              Are you sure you want to delete this order?
            </p>
            <p className="text-sm font-medium text-[var(--color-text)] mb-1">
              {deleteTarget.order_number}
            </p>
            <p className="text-xs text-red-500 mb-5">
              This will also delete all line items and tracking records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
