import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const getApiUrl = () => {
  // 1. Explicit env var takes priority
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EXPO_PUBLIC_DOMAIN)
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

  // 2. Auto-detect dev machine IP from Expo's debugger host
  //    hostUri is like "192.168.x.x:8081" — we extract just the IP
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const host = debuggerHost.split(":")[0]; // extract IP, drop port
    return `http://${host}:5000/api`;
  }

  // 3. Fallback (web or emulator)
  return "http://localhost:5000/api";
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; meta?: Record<string, unknown> }> {
  const token = await AsyncStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: { success: boolean; data: T; meta?: Record<string, unknown>; message?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

export async function apiGet<T>(endpoint: string) {
  return apiRequest<T>(endpoint, { method: "GET" });
}

export async function apiPost<T>(endpoint: string, body: unknown) {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(endpoint: string, body: unknown) {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(endpoint: string) {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "staff" | "admin";
  permissions: {
    canViewCostPrice: boolean;
    canEditPrice: boolean;
    canViewReports: boolean;
    canManageStaff: boolean;
  };
}

export interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  sellingPrice: number;
  mrp?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  gstPercent: number;
  hsnCode?: string;
  barcode?: string;
  internalCode?: string;
  images: string[];
  specifications?: { key: string; value: string }[];
  isActive: boolean;
  description?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  totalDue?: number;
}

export interface InvoiceItem {
  product: Product;
  qty: number;
  price: number;
  gstPercent: number;
  gstAmount: number;
  subtotal: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer?: Customer;
  items: InvoiceItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMode: "cash" | "upi" | "card" | "credit";
  createdAt: string;
  staff?: { name: string };
}

export interface Quotation {
  _id: string;
  quotationNumber: string;
  customer?: Customer;
  items: InvoiceItem[];
  total: number;
  status: "draft" | "sent" | "converted" | "expired";
  createdAt: string;
}

export interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StockMovement {
  _id: string;
  product: string | Product;
  type: "in" | "out" | "adjustment";
  qty: number;
  note?: string;
  createdAt: string;
  staff?: { name: string };
}

export interface Inquiry {
  _id: string;
  product: Product;
  createdAt: string;
}

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  isActive: boolean;
  permissions: {
    canViewCostPrice: boolean;
    canEditPrice: boolean;
    canViewReports: boolean;
    canManageStaff: boolean;
  };
}

export interface SalesReport {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  topPaymentMode: string;
  grossProfit?: number;
  expenses?: number;
  netProfit?: number;
}

export interface ProfitLossReport {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface Banner {
  _id: string;
  imageUrl: string;
  createdAt: string;
}
