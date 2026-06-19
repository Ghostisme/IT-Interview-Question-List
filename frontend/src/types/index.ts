export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  rrp: number;
  weight: number;
  volumetric_gross_weight: number;
  length: number;
  width: number;
  height: number;
  volume: number;
  category: string;
  barcode: string;
  dosage_type: string;
  product_type: string;
  size: string;
  schedule: string;
  image_url: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  assigned_tracking: string;
  image_url: string;
}

export interface TrackingEvent {
  id: number;
  event_time: string;
  status: string;
  location: string;
  description: string;
}

export interface TrackingRecord {
  id: number;
  order_id: number;
  carrier: string;
  tracking_number: string;
  tracking_label: string;
  status: string;
  status_detail: string;
  current_location: string;
  estimated_delivery: string | null;
  last_updated: string;
  events: TrackingEvent[];
}

export interface Order {
  id: number;
  order_number: string;
  company_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: string;
  status: string;
  subtotal: number;
  gst: number;
  shipping_fee: number;
  total: number;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  tracking_records: TrackingRecord[];
}

export interface OrderSummary {
  id: number;
  order_number: string;
  customer_name: string;
  company_name: string;
  status: string;
  total: number;
  item_count: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ShippingQuote {
  service_name: string;
  service_code: string;
  price: number;
  estimated_days: string;
}

export interface TrackingQuery {
  carrier: string;
  tracking_number: string;
  status: string;
  events: Record<string, unknown>[];
  raw: Record<string, unknown>;
}
