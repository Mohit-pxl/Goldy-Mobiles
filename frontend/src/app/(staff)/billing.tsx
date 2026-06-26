import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomerPicker from "@/components/CustomerPicker";
import { useCart } from "@/context/CartContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Customer, Invoice, Product } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const PAYMENT_MODES = ["cash", "upi", "card", "credit"] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number];

const MODE_ICONS: Record<string, string> = {
  cash: "💵",
  upi: "📱",
  card: "💳",
  credit: "📒",
};

export default function BillingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedProductId?: string; mode?: string }>();
  const isQuotationMode = params.mode === "quotation";
  const { items, addItem, updateQty, clearCart, subtotal, gstAmount, total } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [placing, setPlacing] = useState<null | "paid" | "unpaid">(null);
  const [barcodeText, setBarcodeText] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);

  const { data: recentInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await apiGet<Invoice[]>("/billing/invoices");
      return (res.data || []).slice(-5).reverse();
    },
  });

  const prevScannedId = useRef<string | undefined>(undefined);

  /* ── Handle scanned product returned from camera screen ── */
  useEffect(() => {
    const sid = params.scannedProductId;
    if (!sid || sid === prevScannedId.current) return;
    prevScannedId.current = sid;
    apiGet<Product>(`/products/${sid}`)
      .then((r) => { addItem(r.data); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); })
      .catch(() => Alert.alert("Error", "Could not load scanned product."));
  }, [params.scannedProductId]);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  /* ── Product name search ── */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiGet<Product[]>(`/products?search=${encodeURIComponent(q)}&limit=5`);
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  /* ── Manual barcode text lookup ── */
  const handleBarcodeSearch = async () => {
    if (!barcodeText.trim()) return;
    try {
      const res = await apiGet<Product>(`/products/barcode/${barcodeText.trim()}`);
      addItem(res.data);
      setBarcodeText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Not found", "No product matches that barcode.");
    }
  };

  /* ── Place order ── */
  const handlePlaceOrder = async (paymentStatus: "paid" | "unpaid" = "paid") => {
    if (items.length === 0) {
      Alert.alert("Empty cart", "Add at least one product.");
      return;
    }
    // Credit mode needs a customer
    if (!isQuotationMode && paymentMode === "credit" && !customer && paymentStatus === "paid") {
      Alert.alert("Customer required", "Credit sales must be linked to a customer.");
      return;
    }
    // Unpaid always needs a customer
    if (paymentStatus === "unpaid" && !customer) {
      Alert.alert("Customer required", "Unpaid invoices must be linked to a customer account.");
      return;
    }
    setPlacing(paymentStatus);
    try {
      if (isQuotationMode) {
        const res = await apiPost<{ _id: string }>("/quotations", {
          items: items.map((i) => ({
            product: i.product,
            qty: i.qty,
            price: i.product.sellingPrice,
            gstPercent: i.product.gstPercent,
            subtotal: i.product.sellingPrice * i.qty,
            gstAmount: (i.product.sellingPrice * i.qty) * (i.product.gstPercent / 100),
          })),
          customerId: customer?._id || undefined,
          total,
          status: "draft",
        });
        clearCart();
        setCustomer(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/staff/quotation/${res.data._id}`);
      } else {
        const res = await apiPost<{ _id: string }>("/billing/invoices", {
          items: items.map((i) => ({ productId: i.product._id, qty: i.qty, price: i.product.sellingPrice })),
          paymentMode: paymentStatus === "unpaid" ? "credit" : paymentMode,
          paymentStatus,
          ...(customer ? { customerId: customer._id } : {}),
        });
        clearCart();
        setCustomer(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/staff/invoice/${res.data._id}`);
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to place order.");
    } finally {
      setPlacing(null);
    }
  };

  const isCreditMode = paymentMode === "credit";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isQuotationMode ? "New Quotation" : "New Sale"}
          </Text>
          <Text style={[styles.invNum, { color: colors.text3 }]}>
            {isQuotationMode ? `QT-${Date.now().toString().slice(-4)}` : `INV-${Date.now().toString().slice(-4)}`}
          </Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={clearCart} hitSlop={8}>
            <Text style={{ color: colors.destructive, fontSize: 12, fontFamily: "Inter_400Regular" }}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 200 }}
      >
        {/* ── Scan Barcode Banner ── */}
        <Pressable
          style={({ pressed }) => [
            styles.scanBanner,
            {
              backgroundColor: colors.bg2,
              borderColor: colors.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/staff/barcode-scanner");
          }}
        >
          <View style={[styles.scanIconWrap, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="barcode-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.scanBannerTitle, { color: colors.primary }]}>Scan barcode</Text>
            <Text style={[styles.scanBannerSub, { color: colors.text3 }]}>Point camera at product barcode</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>

        {/* ── Manual barcode (optional, kept for utility but styled cleanly) ── */}
        <View style={[styles.barcodeBox, { backgroundColor: colors.bg4 }]}>
          <Ionicons name="keypad" size={16} color={colors.text3} />
          <TextInput
            style={[styles.barcodeInput, { color: colors.foreground }]}
            placeholder="Or type barcode manually..."
            placeholderTextColor={colors.text3}
            value={barcodeText}
            onChangeText={setBarcodeText}
            onSubmitEditing={handleBarcodeSearch}
            returnKeyType="search"
          />
          {barcodeText.length > 0 && (
            <Pressable onPress={() => { handleBarcodeSearch(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8} style={styles.searchActionBtn}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>Enter</Text>
            </Pressable>
          )}
        </View>

        {/* ── Product search ── */}
        <View style={[styles.searchBox, { backgroundColor: colors.bg4 }]}>
          <Ionicons name="search" size={18} color={colors.text3} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by product name"
            placeholderTextColor={colors.text3}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
          {searchQuery.length > 0 && !searching && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text3} />
            </Pressable>
          )}
        </View>

        {searchResults.length > 0 && (
          <View style={[styles.results, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            {searchResults.map((p) => (
              <Pressable
                key={p._id}
                style={[styles.resultRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  addItem(p);
                  setSearchQuery("");
                  setSearchResults([]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[styles.resultSub, { color: colors.text3 }]}>
                    {p.brand} · {fmt(p.sellingPrice)} · {p.stock} in stock
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Cart ── */}
        <View style={styles.cartHeader}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Cart · {items.length} items</Text>
        </View>

        {items.length === 0 ? (
          <View style={[styles.emptyCart, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
            <Ionicons name="cart-outline" size={28} color={colors.text3} />
            <Text style={[styles.emptyCartText, { color: colors.text3 }]}>
              Cart is empty
            </Text>
          </View>
        ) : (
          <View style={[styles.cartBox, { borderColor: colors.border }]}>
            {items.map((item, idx) => (
              <View
                key={item.product._id}
                style={[
                  styles.cartRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                  },
                ]}
              >
                  <View style={[styles.cartThumb, { backgroundColor: colors.bg4 }]}>
                    <Ionicons name="cube-outline" size={16} color={colors.text2} />
                  </View>
                  <View style={styles.cartInfo}>
                    <Text style={[styles.cartName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.cartSub, { color: colors.text3 }]}>
                      {fmt(item.product.sellingPrice)} × {item.qty}
                      {item.qty > 1 ? ` = ${fmt(item.product.sellingPrice * item.qty)}` : ""}
                    </Text>
                  </View>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={[styles.qtyBtn, { borderColor: colors.border2 }]}
                    onPress={() => updateQty(item.product._id, item.qty - 1)}
                  >
                    <Ionicons name="remove" size={14} color={colors.text2} />
                  </Pressable>
                  <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.qty}</Text>
                  <Pressable
                    style={[styles.qtyBtn, { borderColor: colors.border2 }]}
                    onPress={() => updateQty(item.product._id, item.qty + 1)}
                  >
                    <Ionicons name="add" size={14} color={colors.text2} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Totals ── */}
        {items.length > 0 && (
          <View style={[styles.totalsBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text3 }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text3 }]}>CGST</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>{fmt(gstAmount / 2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text3 }]}>SGST</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>{fmt(gstAmount / 2)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.grandValue, { color: colors.primary }]}>{fmt(total)}</Text>
            </View>
          </View>
        )}

        {/* ── Payment mode ── */}
        {!isQuotationMode && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Payment mode</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_MODES.map((mode) => {
                const active = paymentMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.payBtn,
                      {
                        backgroundColor: active ? colors.primary : colors.bg3,
                        borderColor: active ? colors.primary : colors.border2,
                      },
                    ]}
                    onPress={() => setPaymentMode(mode)}
                  >
                    <Text style={styles.payBtnEmoji}>{MODE_ICONS[mode]}</Text>
                    <Text style={[styles.payBtnLabel, { color: active ? "#000" : colors.text2 }]}>
                      {mode.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Customer picker ── */}
        <View style={styles.customerSection}>
          <View style={styles.customerHeader}>
            <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Customer</Text>
            {!isQuotationMode && isCreditMode && (
              <View style={[styles.requiredBadge, { backgroundColor: colors.redBg }]}>
                <Text style={[styles.requiredText, { color: colors.redText }]}>Required for credit</Text>
              </View>
            )}
          </View>
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </View>

        {/* ── Recent Invoices ── */}
        {recentInvoices.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Recent Invoices</Text>
            <View style={[styles.recentBox, { borderColor: colors.border }]}>
              {recentInvoices.map((inv, idx) => (
                <Pressable
                  key={inv._id}
                  style={[
                    styles.recentRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: idx < recentInvoices.length - 1 ? 1 : 0,
                    },
                  ]}
                  onPress={() => router.push(`/staff/invoice/${inv._id}`)}
                >
                  <View style={[styles.recentIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={[styles.recentNum, { color: colors.foreground }]}>{inv.invoiceNumber}</Text>
                    <Text style={[styles.recentSub, { color: colors.text3 }]}>
                      {inv.customer?.name || "Walk-in"} · {inv.paymentMode.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={[styles.recentTotal, { color: colors.foreground }]}>₹{inv.total.toLocaleString("en-IN")}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.text3} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      {items.length > 0 && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.bg2,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "ios" ? insets.bottom + 80 : insets.bottom + 12,
            },
          ]}
        >
          {/* Amount summary row */}
          <View style={styles.bottomSummaryRow}>
            <Text style={[styles.bottomTotal, { color: colors.foreground }]}>{fmt(total)}</Text>
            <Text style={[styles.bottomMeta, { color: colors.text3 }]}>
              {items.length} item{items.length !== 1 ? "s" : ""}
              {!isQuotationMode ? ` · ${paymentMode.toUpperCase()}` : ""}
              {customer ? ` · ${customer.name}` : ""}
            </Text>
          </View>

          {isQuotationMode ? (
            /* Quotation mode — single save button */
            <Pressable
              style={[styles.placeBtn, { backgroundColor: colors.primary, opacity: placing ? 0.7 : 1 }]}
              onPress={() => handlePlaceOrder("paid")}
              disabled={!!placing}
            >
              {placing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.placeBtnText, { color: "#000" }]}>
                  Save Quotation {fmt(total)} →
                </Text>
              )}
            </Pressable>
          ) : (
            /* Sale mode — two buttons */
            <View style={styles.btnRow}>
              {/* Generate Invoice (Unpaid) */}
              <Pressable
                style={[
                  styles.placeBtnOutline,
                  {
                    borderColor: !customer ? colors.border : colors.primary,
                    opacity: placing === "unpaid" ? 0.7 : 1,
                  },
                ]}
                onPress={() => handlePlaceOrder("unpaid")}
                disabled={!!placing}
              >
                {placing === "unpaid" ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <View style={styles.placeBtnInner}>
                    <Ionicons name="document-text-outline" size={16} color={!customer ? colors.text3 : colors.primary} />
                    <Text style={[styles.placeBtnOutlineText, { color: !customer ? colors.text3 : colors.primary }]}>
                      Unpaid
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Generate Invoice (Paid) */}
              <Pressable
                style={[
                  styles.placeBtnFill,
                  { backgroundColor: colors.foreground, opacity: placing === "paid" ? 0.7 : 1 },
                ]}
                onPress={() => handlePlaceOrder("paid")}
                disabled={!!placing}
              >
                {placing === "paid" ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <View style={styles.placeBtnInner}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.background} />
                    <Text style={[styles.placeBtnText, { color: colors.background }]}>
                      Charge {fmt(total)}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  invNum: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  scanBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#e8a825",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  scanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBannerTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  scanBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  barcodeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  barcodeInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  searchActionBtn: {
    backgroundColor: "rgba(232, 168, 37, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  results: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  resultSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  cartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  emptyCart: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderStyle: "dashed",
  },
  emptyCartText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  cartBox: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  cartThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cartInfo: { flex: 1, minWidth: 0 },
  cartName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cartSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 3 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", minWidth: 16, textAlign: "center" },
  totalsBox: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  grandLabel: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  grandValue: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginVertical: 4 },
  paymentGrid: { flexDirection: "row", gap: 8 },
  payBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
    gap: 2,
  },
  payBtnEmoji: { fontSize: 16 },
  payBtnLabel: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  customerSection: { gap: 8 },
  customerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  requiredText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  /* Bottom bar */
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  bottomSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bottomTotal: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  bottomMeta: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", flex: 1, paddingLeft: 8 },
  btnRow: { flexDirection: "row", gap: 10 },
  placeBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  placeBtnOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtnOutlineText: { fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  placeBtnFill: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  placeBtnText: { fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 15 },
  /* Recent Invoices */
  recentSection: { gap: 10 },
  recentBox: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recentInfo: { flex: 1, minWidth: 0 },
  recentNum: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  recentSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  recentRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  recentTotal: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
