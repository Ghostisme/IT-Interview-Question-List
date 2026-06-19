/**
 * OrderDetailPage — Two-column layout matching the assessment sample screenshot:
 *   Left column:  Order header, SKU line items (with images), financial summary, shipping info
 *   Right column: Logistics tracking timeline for each tracking record
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, User, Mail, Phone, Building2,
  Trash2, Package, Clock, ImageOff,
} from "lucide-react";
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

function ProductImage({ src, sku }: { src: string; sku: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <ImageOff size={16} className="text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={sku}
      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-100"
      onError={() => setError(true)}
    />
  );
}

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
      {/* ── Top bar ── */}
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

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ═══ LEFT COLUMN (3/5) — Order Details + Items ═══ */}
        <div className="lg:col-span-3 space-y-6">

          {/* Order Header */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text)]">Order Details</h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                  {order.order_number}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {order.company_name && (
                <div className="flex items-start gap-2">
                  <Building2 size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-[var(--color-text-muted)]">Company</p>
                    <p className="font-medium text-[var(--color-text)]">{order.company_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <User size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-[var(--color-text-muted)]">Customer</p>
                  <p className="font-medium text-[var(--color-text)]">{order.customer_name || "—"}</p>
                </div>
              </div>
              {order.customer_phone && (
                <div className="flex items-start gap-2">
                  <Phone size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                  <div>
                    <p className="text-[var(--color-text-muted)]">Phone</p>
                    <p className="font-medium text-[var(--color-text)]">{order.customer_phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Mail size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-[var(--color-text-muted)]">Email</p>
                  <p className="font-medium text-[var(--color-text)]">{order.customer_email || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-[var(--color-text-muted)]">Shipping Address</p>
                  <p className="font-medium text-[var(--color-text)]">{order.shipping_address || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                <div>
                  <p className="text-[var(--color-text-muted)]">Order Date</p>
                  <p className="font-medium text-[var(--color-text)]">
                    {new Date(order.created_at).toLocaleDateString("en-AU", {
                      year: "2-digit", month: "2-digit", day: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SKU Line Items with Images */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-[var(--color-text)]">
                Order Items ({order.items.length})
              </h2>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {order.items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <ProductImage src={item.image_url} sku={item.sku} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {item.product_name}
                      </span>
                      {item.assigned_tracking && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                          {item.assigned_tracking}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">{item.sku}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      ${item.unit_price.toFixed(2)} × {item.quantity}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      ${item.line_total.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-[var(--color-border)] bg-slate-50/60 px-6 py-4">
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex gap-12">
                  <span className="text-[var(--color-text-muted)]">Subtotal</span>
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
        </div>

        {/* ═══ RIGHT COLUMN (2/5) — Logistics Tracking ═══ */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-[var(--color-text)]">Logistics Tracking</h2>
            </div>

            {order.tracking_records.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
                No tracking information available.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {order.tracking_records.map((t) => (
                  <div key={t.id} className="px-5 py-5">
                    {/* Tracking Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Package size={16} className="text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--color-text)]">
                              {t.carrier}
                            </span>
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.tracking_label && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {t.tracking_label}
                              </span>
                            )}
                            <span className="text-xs font-mono text-[var(--color-text-muted)]">
                              {t.tracking_number}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {t.estimated_delivery && (
                      <div className="mb-3 text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock size={11} />
                        Est. Delivery:{" "}
                        {new Date(t.estimated_delivery).toLocaleDateString("en-AU", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </div>
                    )}

                    {/* Current Location */}
                    {t.current_location && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-[var(--color-primary)]" />
                          <span className="text-xs text-[var(--color-text)]">
                            <span className="font-medium text-[var(--color-primary)]">Current: </span>
                            {t.current_location}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Event Timeline */}
                    {t.events && t.events.length > 0 && (
                      <div className="ml-3 relative">
                        {t.events.map((evt, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === t.events.length - 1;
                          const dotColor = EVENT_COLORS[evt.status] ?? "bg-slate-300";

                          return (
                            <div key={evt.id} className="relative flex gap-2.5 pb-3.5 last:pb-0">
                              {!isLast && (
                                <div className="absolute left-[5px] top-3.5 bottom-0 w-0.5 bg-slate-200" />
                              )}
                              <div className="relative flex-shrink-0 mt-0.5">
                                <div
                                  className={`w-[11px] h-[11px] rounded-full border-2 border-white shadow-sm ${dotColor} ${
                                    isFirst ? "ring-2 ring-offset-1 ring-blue-200" : ""
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className={`text-xs font-semibold ${isFirst ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}>
                                    {evt.status}
                                  </span>
                                  <span className="text-[10px] text-[var(--color-text-muted)]">
                                    {new Date(evt.event_time).toLocaleString("en-AU", {
                                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {evt.location && (
                                  <p className="text-[10px] text-[var(--color-text-muted)]">{evt.location}</p>
                                )}
                                {evt.description && (
                                  <p className="text-[10px] text-[var(--color-text)] mt-0.5 leading-relaxed">
                                    {evt.description}
                                  </p>
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
        </div>
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
