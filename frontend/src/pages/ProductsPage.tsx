/**
 * ProductsPage — Full CRUD product management page.
 * Features: paginated table with page size selector, search, create/edit modal,
 *           delete confirmation, error toast feedback.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";
import { productsApi } from "../lib/api";
import { SkeletonRow } from "../components/Skeleton";
import type { Product } from "../types";

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  rrp: string;
  weight: string;
  category: string;
}

const EMPTY_FORM: ProductForm = { sku: "", name: "", description: "", rrp: "", weight: "", category: "" };
const PAGE_SIZES = [10, 20, 50];

/* ─── Toast Notification ─── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top">
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

/* ─── Product Modal ─── */

function ProductModal({
  mode,
  initial,
  onClose,
  onSave,
  saving,
  error,
}: {
  mode: "create" | "edit";
  initial: ProductForm;
  onClose: () => void;
  onSave: (data: ProductForm) => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<ProductForm>(initial);
  const set = (k: keyof ProductForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            {mode === "create" ? "Add Product" : "Edit Product"}
          </h2>
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
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">SKU *</label>
              <input
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                disabled={mode === "edit"}
                placeholder="e.g. TBAMET10"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] disabled:bg-slate-50 disabled:text-[var(--color-text-muted)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Oil, Pastille, Flower"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Product Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full product name"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">RRP ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                value={form.rrp}
                onChange={(e) => set("rrp", e.target.value)}
                placeholder="175.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="0.20"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.sku || !form.name || !form.rrp}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; initial: ProductForm } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryClient = useQueryClient();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const extractError = useCallback((err: unknown): string => {
    const resp = (err as { response?: { data?: { detail?: string }; status?: number } })?.response;
    if (resp?.data?.detail) return resp.data.detail;
    if (resp?.status === 409) return "A product with this SKU already exists.";
    return "An unexpected error occurred. Please try again.";
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, pageSize, debouncedSearch],
    queryFn: () => productsApi.list({ page, page_size: pageSize, search: debouncedSearch }),
  });

  const createMutation = useMutation({
    mutationFn: (form: ProductForm) =>
      productsApi.create({
        sku: form.sku,
        name: form.name,
        description: form.description,
        rrp: parseFloat(form.rrp),
        weight: parseFloat(form.weight || "0"),
        category: form.category,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModal(null);
      setMutationError(null);
      setSearch("");
      setDebouncedSearch("");
      setToast({ message: `Product ${variables.sku} created successfully`, type: "success" });
    },
    onError: (err) => setMutationError(extractError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ sku, form }: { sku: string; form: ProductForm }) =>
      productsApi.update(sku, {
        name: form.name,
        description: form.description,
        rrp: parseFloat(form.rrp),
        weight: parseFloat(form.weight || "0"),
        category: form.category,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModal(null);
      setMutationError(null);
      setToast({ message: `Product ${variables.sku} updated successfully`, type: "success" });
    },
    onError: (err) => setMutationError(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (sku: string) => productsApi.delete(sku),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
      setToast({ message: "Product deleted", type: "success" });
    },
    onError: (err) => {
      setDeleteTarget(null);
      setToast({ message: extractError(err), type: "error" });
    },
  });

  const handleSave = (form: ProductForm) => {
    setMutationError(null);
    if (modal?.mode === "create") {
      createMutation.mutate(form);
    } else if (modal?.mode === "edit") {
      updateMutation.mutate({ sku: form.sku, form });
    }
  };

  const openEdit = (p: Product) => {
    setMutationError(null);
    setModal({
      mode: "edit",
      initial: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        rrp: p.rrp.toString(),
        weight: p.weight.toString(),
        category: p.category,
      },
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Products</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] w-64 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
            />
          </div>
          <button
            onClick={() => { setMutationError(null); setModal({ mode: "create", initial: EMPTY_FORM }); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-slate-50/60">
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Category</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">RRP ($)</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Weight (kg)</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              : data?.items.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                      {debouncedSearch ? `No products match "${debouncedSearch}"` : "No products yet. Click 'Add Product' to create one."}
                    </td>
                  </tr>
                )
                : data?.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-primary)]">{p.sku}</td>
                    <td className="px-4 py-3 text-[var(--color-text)]">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-slate-100 text-[var(--color-text-muted)]">
                        {p.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--color-text)]">
                      ${p.rrp.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-muted)]">
                      {p.weight.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination — always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-slate-50/30">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">
              {data ? `${data.total} product${data.total !== 1 ? "s" : ""}` : "—"}
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

      {/* Create/Edit Modal */}
      {modal && (
        <ProductModal
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => { setModal(null); setMutationError(null); }}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
          error={mutationError}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Delete Product</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">
              Are you sure you want to delete this product?
            </p>
            <p className="text-sm font-medium text-[var(--color-text)] mb-5">
              {deleteTarget.sku} — {deleteTarget.name}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.sku)}
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
