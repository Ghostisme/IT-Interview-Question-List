/**
 * ShippingPage — Shipping Tools page with two main features:
 *
 * 1. Shipping Quote Calculator:
 *    Calls AusPost API to get domestic parcel shipping cost estimates
 *    based on origin/destination postcodes and package weight.
 *
 * 2. Tracking Lookup:
 *    Queries carrier APIs (AusPost/StarTrack or TNT) to retrieve
 *    the current delivery status for a given tracking number.
 *    TNT operates in degraded mode (returns a web tracking link).
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator, Search, Zap } from "lucide-react";
import { trackingApi } from "../lib/api";
import type { ShippingQuote, TrackingQuery } from "../types";

/* ------------------------------------------------------------------ */
/*  Pre-defined examples users can click to auto-fill the form fields */
/* ------------------------------------------------------------------ */

const QUOTE_EXAMPLES = [
  { label: "Sydney → Melbourne (0.5kg)", from: "2000", to: "3000", weight: "0.5" },
  { label: "Melbourne → Brisbane (2kg)", from: "3000", to: "4000", weight: "2.0" },
  { label: "Sydney → Perth (5kg)", from: "2000", to: "6000", weight: "5.0" },
  { label: "Adelaide → Hobart (1kg)", from: "5000", to: "7000", weight: "1.0" },
] as const;

const TRACKING_EXAMPLES = [
  { label: "StarTrack — ABC123456789", number: "ABC123456789", carrier: "auspost" },
  { label: "StarTrack — DEF987654321", number: "DEF987654321", carrier: "auspost" },
  { label: "TNT — GHI111222333", number: "GHI111222333", carrier: "tnt" },
] as const;

export default function ShippingPage() {
  const [fromPostcode, setFromPostcode] = useState("2000");
  const [toPostcode, setToPostcode] = useState("3000");
  const [weight, setWeight] = useState("1.0");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("auspost");

  /** Calls POST /api/tracking/shipping-quote via AusPost pricing API */
  const quoteMutation = useMutation({
    mutationFn: () =>
      trackingApi.shippingQuote({
        from_postcode: fromPostcode,
        to_postcode: toPostcode,
        weight: parseFloat(weight),
      }),
  });

  /** Calls GET /api/tracking/query to look up live tracking status */
  const trackMutation = useMutation({
    mutationFn: () => trackingApi.query(trackingNumber, carrier),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Shipping Tools</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Calculate shipping costs and track parcels via AusPost / StarTrack / TNT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ============================================================ */}
        {/*  LEFT CARD — Shipping Quote Calculator                       */}
        {/* ============================================================ */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Calculator size={18} />
            Shipping Quote
          </h2>

          {/* Quick-fill example buttons */}
          <div className="mb-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Zap size={12} /> Quick Examples
            </p>
            <div className="flex flex-wrap gap-2">
              {QUOTE_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFromPostcode(ex.from);
                    setToPostcode(ex.to);
                    setWeight(ex.weight);
                  }}
                  className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-blue-50 hover:text-[var(--color-primary)] hover:border-blue-200 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                  From Postcode
                </label>
                <input
                  value={fromPostcode}
                  onChange={(e) => setFromPostcode(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                  To Postcode
                </label>
                <input
                  value={toPostcode}
                  onChange={(e) => setToPostcode(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 1.0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <button
              onClick={() => quoteMutation.mutate()}
              disabled={quoteMutation.isPending}
              className="w-full py-2.5 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors disabled:opacity-50"
            >
              {quoteMutation.isPending ? "Calculating..." : "Get Quotes"}
            </button>
          </div>

          {/* Quote results list */}
          {quoteMutation.data && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {(quoteMutation.data as ShippingQuote[]).length} service(s) available
              </p>
              {(quoteMutation.data as ShippingQuote[]).map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{q.service_name}</p>
                    {q.estimated_days && (
                      <p className="text-xs text-[var(--color-text-muted)]">{q.estimated_days}</p>
                    )}
                  </div>
                  <span className="font-semibold text-[var(--color-text)]">${q.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {quoteMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              Failed to fetch quotes. Please check postcodes and try again.
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/*  RIGHT CARD — Tracking Lookup                                */}
        {/* ============================================================ */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <Search size={18} />
            Track Shipment
          </h2>

          {/* Quick-fill tracking examples */}
          <div className="mb-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Zap size={12} /> Quick Examples
            </p>
            <div className="flex flex-wrap gap-2">
              {TRACKING_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTrackingNumber(ex.number);
                    setCarrier(ex.carrier);
                  }}
                  className="px-2.5 py-1 text-xs rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-blue-50 hover:text-[var(--color-primary)] hover:border-blue-200 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)]"
              >
                <option value="auspost">AusPost / StarTrack</option>
                <option value="tnt">TNT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Tracking Number
              </label>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. ABC123456789"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <button
              onClick={() => trackMutation.mutate()}
              disabled={trackMutation.isPending || !trackingNumber}
              className="w-full py-2.5 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors disabled:opacity-50"
            >
              {trackMutation.isPending ? "Searching..." : "Track"}
            </button>
          </div>

          {/* Tracking result display */}
          {trackMutation.data && (
            <div className="mt-4 p-4 rounded-lg bg-slate-50">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Carrier</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {(trackMutation.data as TrackingQuery).carrier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Status</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {(trackMutation.data as TrackingQuery).status}
                  </span>
                </div>
                {typeof (trackMutation.data as TrackingQuery).raw?.tracking_url === "string" && (
                  <a
                    href={(trackMutation.data as TrackingQuery).raw.tracking_url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[var(--color-primary)] text-sm underline mt-2"
                  >
                    View on carrier website
                  </a>
                )}
              </div>
            </div>
          )}

          {trackMutation.isError && (
            <p className="mt-3 text-sm text-red-600">Tracking lookup failed.</p>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BOTTOM — Reference table of Australian postcodes            */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="font-semibold text-[var(--color-text)] mb-3">Australian Postcode Reference</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Common postcodes for testing shipping quotes
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-slate-50/60">
                <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">City</th>
                <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">State</th>
                <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Postcode</th>
                <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {[
                { city: "Sydney CBD", state: "NSW", code: "2000", note: "Default origin" },
                { city: "Parramatta", state: "NSW", code: "2150", note: "Western Sydney hub" },
                { city: "Melbourne CBD", state: "VIC", code: "3000", note: "Default destination" },
                { city: "Brisbane CBD", state: "QLD", code: "4000", note: "Queensland capital" },
                { city: "Perth CBD", state: "WA", code: "6000", note: "Long-distance test" },
                { city: "Adelaide CBD", state: "SA", code: "5000", note: "South Australia" },
                { city: "Hobart CBD", state: "TAS", code: "7000", note: "Tasmania (cross-strait)" },
                { city: "Darwin CBD", state: "NT", code: "0800", note: "Northern Territory" },
                { city: "Canberra", state: "ACT", code: "2600", note: "National capital" },
                { city: "Gold Coast", state: "QLD", code: "4217", note: "Regional area" },
              ].map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2 text-[var(--color-text)]">{r.city}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">{r.state}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[var(--color-primary)]">{r.code}</td>
                  <td className="px-4 py-2 text-xs text-[var(--color-text-muted)]">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
