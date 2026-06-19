/**
 * OrderDetailPage — Consolidated order view that satisfies all output requirements:
 *   - Order header (number, status, customer, address)
 *   - SKU lines with unit price, quantities, and matched details
 *   - Tracking information with event timeline
 *   - Subtotal, GST, Shipment Fee, Total (always shown)
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, User, Mail, Trash2, Package, Clock } from "lucide-react";
import { ordersApi } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { SkeletonCard } from "../components/Skeleton";

const ALL_STATUSES = ["pending", "in_transit", "completed", "cancelled"];

const EVENT_COLORS: Record<string, string> = {
  "Order Placed": "bg-slate-400",
  "Picked Up": "bg-amber-400",
  "In Transit": "bg-blue-500",
  Arrived: "bg-indigo-500",
  Processing: "bg-orange-400",
  "Out for Delivery": "bg-violet-500",
  Delivered: "bg-emerald-500",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(Number(id)),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => ordersApi.updateStatus(Number(id), newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/orders");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-20 text-[var(--color-text-muted)]">Order not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/orders")}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>
        <div className="flex items-center gap-2">
          <a
            href={`/api/orders/${id}/report`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50 transition-colors"
          >
            JSON Report
          </a>
          <button
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            Delete Order
          </button>
        </div>
      </div>

      {/* ── Order Header ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">{order.order_number}</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Created {new Date(order.created_at).toLocaleDateString("en-AU", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={order.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              disabled={statusMutation.isPending}
              className="text-sm rounded-lg border border-[var(--color-border)] px-3 py-1.5 bg-[var(--color-surface)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <User size={16} className="text-[var(--color-text-muted)] mt-0.5" />
            <div>
              <p className="text-[var(--color-text-muted)]">Customer</p>
              <p className="font-medium text-[var(--color-text)]">{order.customer_name || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail size={16} className="text-[var(--color-text-muted)] mt-0.5" />
            <div>
              <p className="text-[var(--color-text-muted)]">Email</p>
              <p className="font-medium text-[var(--color-text)]">{order.customer_email || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-[var(--color-text-muted)] mt-0.5" />
            <div>
              <p className="text-[var(--color-text-muted)]">Shipping Address</p>
              <p className="font-medium text-[var(--color-text)]">{order.shipping_address || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SKU Line Items ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)]">
            Line Items ({order.items.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-slate-50/60">
              <th className="text-left px-6 py-3 font-medium text-[var(--color-text-muted)]">SKU</th>
              <th className="text-left px-6 py-3 font-medium text-[var(--color-text-muted)]">Product</th>
              <th className="text-right px-6 py-3 font-medium text-[var(--color-text-muted)]">Qty</th>
              <th className="text-right px-6 py-3 font-medium text-[var(--color-text-muted)]">Unit Price</th>
              <th className="text-right px-6 py-3 font-medium text-[var(--color-text-muted)]">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-3 font-mono text-xs text-[var(--color-primary)]">{item.sku}</td>
                <td className="px-6 py-3 text-[var(--color-text)]">{item.product_name}</td>
                <td className="px-6 py-3 text-right text-[var(--color-text)]">{item.quantity}</td>
                <td className="px-6 py-3 text-right text-[var(--color-text-muted)]">
                  ${item.unit_price.toFixed(2)}
                </td>
                <td className="px-6 py-3 text-right font-medium text-[var(--color-text)]">
                  ${item.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Financial Summary (always show all rows) ── */}
        <div className="border-t border-[var(--color-border)] bg-slate-50/60 px-6 py-4">
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <div className="flex gap-12">
              <span className="text-[var(--color-text-muted)]">Subtotal (GST incl.)</span>
              <span className="font-medium text-[var(--color-text)] w-24 text-right">
                ${order.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-12">
              <span className="text-[var(--color-text-muted)]">GST (10%)</span>
              <span className="text-[var(--color-text)] w-24 text-right">
                ${order.gst.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-12">
              <span className="text-[var(--color-text-muted)]">Shipment Fee</span>
              <span className="text-[var(--color-text)] w-24 text-right">
                ${order.shipping_fee.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-12 pt-1.5 border-t border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-text)]">Total</span>
              <span className="font-semibold text-[var(--color-text)] w-24 text-right">
                ${order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tracking Information with Event Timeline ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)]">Tracking Information</h2>
        </div>

        {order.tracking_records.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No tracking information available for this order.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {order.tracking_records.map((t) => (
              <div key={t.id} className="px-6 py-5">
                {/* Tracking Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Package size={18} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{t.carrier}</span>
                      <p className="text-xs font-mono text-[var(--color-text-muted)]">{t.tracking_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    {t.estimated_delivery && (
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock size={12} />
                        Est. {new Date(t.estimated_delivery).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Location */}
                {t.current_location && (
                  <div className="mb-4 px-4 py-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[var(--color-primary)]" />
                      <span className="text-xs font-medium text-[var(--color-primary)]">Current Location:</span>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{t.current_location}</span>
                    </div>
                  </div>
                )}

                {/* Event Timeline */}
                {t.events && t.events.length > 0 && (
                  <div className="ml-4 relative">
                    {t.events.map((evt, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === t.events.length - 1;
                      const dotColor = EVENT_COLORS[evt.status] ?? "bg-slate-300";

                      return (
                        <div key={evt.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {!isLast && (
                            <div className="absolute left-[6px] top-4 bottom-0 w-0.5 bg-slate-200" />
                          )}
                          <div className="relative flex-shrink-0 mt-1">
                            <div
                              className={`w-[13px] h-[13px] rounded-full border-2 border-white shadow-sm ${dotColor} ${
                                isFirst ? "ring-2 ring-offset-1 ring-blue-200" : ""
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className={`text-xs font-semibold ${isFirst ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}>
                                {evt.status}
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {new Date(evt.event_time).toLocaleString("en-AU", {
                                  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {evt.location && (
                              <p className="text-xs text-[var(--color-text-muted)]">{evt.location}</p>
                            )}
                            {evt.description && (
                              <p className="text-xs text-[var(--color-text)] mt-0.5 leading-relaxed">{evt.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Delete Order</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">
              Are you sure you want to delete <strong>{order.order_number}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-5">
              This will permanently delete all line items and tracking records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
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
