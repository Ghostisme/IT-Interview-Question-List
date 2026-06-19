/**
 * api.ts — Centralized Axios HTTP client for all backend API calls.
 *
 * All requests go through the Vite dev server proxy (/api → http://127.0.0.1:8000).
 * A global error interceptor logs failed responses to the console.
 *
 * Three API modules:
 *   productsApi  — CRUD operations on the product catalog
 *   ordersApi    — Order lifecycle management (create, list, detail, status update)
 *   trackingApi  — Live tracking queries and shipping cost calculations
 */

import axios from "axios";
import type {
  Product,
  Order,
  OrderSummary,
  PaginatedResponse,
  ShippingQuote,
  TrackingQuery,
} from "../types";

/** Base Axios instance — all requests are prefixed with /api */
const api = axios.create({ baseURL: "/api" });

/** Global error interceptor — logs status and response body for debugging */
api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error("[API]", err.response?.status, err.response?.data);
    return Promise.reject(err);
  },
);

/**
 * Product catalog API.
 * Supports pagination, search (by SKU or name), and category filtering.
 */
export const productsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; category?: string }) =>
    api.get<PaginatedResponse<Product>>("/products", { params }).then((r) => r.data),
  get: (sku: string) => api.get<Product>(`/products/${sku}`).then((r) => r.data),
  create: (data: Partial<Product>) => api.post<Product>("/products", data).then((r) => r.data),
  update: (sku: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${sku}`, data).then((r) => r.data),
  delete: (sku: string) => api.delete(`/products/${sku}`),
  categories: () =>
    api.get<{ category: string; count: number }[]>("/products/categories").then((r) => r.data),
};

/**
 * Order management API.
 * Creating an order only requires SKUs + quantities — the backend
 * automatically resolves prices and calculates totals.
 */
export const ordersApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<OrderSummary>>("/orders", { params }).then((r) => r.data),
  get: (id: number) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (data: { order_number: string; customer_name?: string; items: { sku: string; quantity: number }[] }) =>
    api.post<Order>("/orders", data).then((r) => r.data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, null, { params: { status } }).then((r) => r.data),
  delete: (id: number) => api.delete(`/orders/${id}`),
};

/**
 * Tracking and shipping API.
 * - query():         Live tracking lookup via AusPost or TNT carrier API
 * - shippingQuote(): Domestic parcel pricing from AusPost (postcode + weight)
 * - addTracking():   Attach a tracking number to an existing order
 */
export const trackingApi = {
  query: (tracking_number: string, carrier: string = "auspost") =>
    api.get<TrackingQuery>("/tracking/query", { params: { tracking_number, carrier } }).then((r) => r.data),
  shippingQuote: (data: {
    from_postcode: string;
    to_postcode: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
  }) => api.post<ShippingQuote[]>("/tracking/shipping-quote", data).then((r) => r.data),
  addTracking: (orderId: number, data: { carrier: string; tracking_number: string; status?: string }) =>
    api.post(`/tracking/${orderId}`, data).then((r) => r.data),
};
