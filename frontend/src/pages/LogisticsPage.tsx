/**
 * LogisticsPage — Dynamic order logistics tracking with searchable order list.
 *
 * Features:
 *   - Search orders by order number or customer name via backend API
 *   - Paginated order list (load more) with real-time search
 *   - Detailed logistics timeline for each selected order
 *   - Two-column layout: order info (left) + tracking timeline (right)
 */

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  User,
  Mail,
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ordersApi } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import { SkeletonCard } from "../components/Skeleton";
import type { Order, OrderSummary, TrackingRecord } from "../types";

const EVENT_ICON_COLORS: Record<string, string> = {
  "Order Placed": "bg-slate-400",
  "Picked Up": "bg-amber-400",
  "In Transit": "bg-blue-500",
  Arrived: "bg-indigo-500",
  Processing: "bg-orange-400",
  "Out for Delivery": "bg-violet-500",
  Delivered: "bg-emerald-500",
};

/* ─── Tracking Timeline Component ─── */

function TrackingTimeline({ tracking }: { tracking: TrackingRecord }) {
  const estDate = tracking.estimated_delivery
    ? new Date(tracking.estimated_delivery).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">{tracking.carrier}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Tracking: {tracking.tracking_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={tracking.status} />
          {estDate && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Est. Delivery: {estDate}
            </span>
          )}
        </div>
      </div>

      {tracking.current_location && (
        <div className="mx-5 mt-4 mb-2 px-4 py-3 rounded-lg bg-blue-50/60 border border-blue-100">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-[var(--color-primary)]">Current Location</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
            {tracking.current_location}
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="relative">
          {tracking.events.map((evt, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === tracking.events.length - 1;
            const dotColor = EVENT_ICON_COLORS[evt.status] ?? "bg-slate-300";

            return (
              <div key={evt.id} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-slate-200" />
                )}
                <div className="relative flex-shrink-0 mt-1">
                  <div
                    className={`w-[15px] h-[15px] rounded-full border-2 border-white shadow-sm ${dotColor} ${
                      isFirst ? "ring-2 ring-offset-1 ring-blue-200" : ""
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold ${
                        isFirst ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"
                      }`}
                    >
                      {evt.status}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {new Date(evt.event_time).toLocaleString("en-AU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {evt.location && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{evt.location}</p>
                  )}
                  {evt.description && (
                    <p className="text-sm text-[var(--color-text)] mt-1 leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Order Logistics Detail Card ─── */

function OrderLogisticsCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[var(--color-text)]">Order Details</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Order Number: {order.order_number}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown size={18} className="text-[var(--color-text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
            {/* Left: Order Items + Shipping Info */}
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Order Items</h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} total
                </p>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-[var(--color-text-muted)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
                        ${item.line_total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-between">
                  <span className="text-sm font-semibold text-[var(--color-text)]">Order Total</span>
                  <span className="text-sm font-bold text-[var(--color-text)]">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                  Shipping Information
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <User size={14} className="text-[var(--color-text-muted)] mt-0.5" />
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {order.customer_name || "—"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-[var(--color-text-muted)] mt-0.5" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {order.customer_email || "—"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-[var(--color-text-muted)] mt-0.5" />
                    <p className="text-sm text-[var(--color-text)]">
                      {order.shipping_address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Logistics Tracking */}
            <div className="p-5 space-y-5">
              <h3 className="text-base font-bold text-[var(--color-text)]">Logistics Tracking</h3>
              {order.tracking_records.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
                  No tracking information available.
                </p>
              ) : (
                <div className="space-y-5">
                  {order.tracking_records.map((t) => (
                    <TrackingTimeline key={t.id} tracking={t} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Searchable Order Selector ─── */

function OrderSelector({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<OrderSummary[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllItems([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["orders-logistics-search", debouncedSearch, page],
    queryFn: () => ordersApi.list({ page, page_size: PAGE_SIZE, search: debouncedSearch }),
  });

  useEffect(() => {
    if (data?.items) {
      setAllItems((prev) => {
        if (page === 1) return data.items;
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = data.items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const hasMore = data ? page < data.total_pages : false;
  const totalCount = data?.total ?? 0;

  const handleSelect = (order: OrderSummary) => {
    onSelect(order.id);
    setIsOpen(false);
  };

  const loadMore = () => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  };

  const selectedItem = allItems.find((o) => o.id === selectedId);

  return (
    <div ref={dropdownRef} className="relative w-full max-w-xl">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:border-[var(--color-primary)] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
          {selectedItem ? (
            <span className="truncate text-[var(--color-text)]">
              {selectedItem.order_number} — {selectedItem.customer_name || "No name"}{" "}
              <span className="text-[var(--color-text-muted)]">
                ({selectedItem.status.replace(/_/g, " ")})
              </span>
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">Select an order to view tracking...</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--color-text-muted)] flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order number or customer..."
                className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                autoFocus
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 px-1">
              {totalCount} order{totalCount !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* Options List */}
          <div className="max-h-72 overflow-y-auto">
            {isLoading && page === 1 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
              </div>
            ) : allItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                No orders found
              </div>
            ) : (
              <>
                {allItems.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleSelect(o)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-[var(--color-border)] last:border-b-0 ${
                      o.id === selectedId ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-primary)]">
                          {o.order_number}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--color-text)]">
                          {o.customer_name || "No name"}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {o.item_count} item{o.item_count > 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap ml-3">
                      ${o.total.toFixed(2)}
                    </span>
                  </button>
                ))}

                {/* Load More */}
                {hasMore && (
                  <button
                    onClick={(e) => { e.stopPropagation(); loadMore(); }}
                    disabled={isFetching}
                    className="w-full py-3 text-sm text-center text-[var(--color-primary)] hover:bg-blue-50/60 transition-colors flex items-center justify-center gap-2"
                  >
                    {isFetching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {isFetching ? "Loading..." : `Load more (${totalCount - allItems.length} remaining)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function LogisticsPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: selectedOrder, isLoading: orderLoading } = useQuery({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => ordersApi.get(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Logistics</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Track shipments and view delivery timeline
          </p>
        </div>
      </div>

      {/* Order Selector */}
      <div className="flex items-center gap-3">
        <Clock size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <OrderSelector selectedId={selectedOrderId} onSelect={setSelectedOrderId} />
      </div>

      {/* Content */}
      {selectedOrderId === null && (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select an order above</p>
          <p className="text-sm mt-1">to view its logistics tracking timeline</p>
        </div>
      )}

      {orderLoading && selectedOrderId !== null && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {selectedOrder && !orderLoading && <OrderLogisticsCard order={selectedOrder} />}
    </div>
  );
}
