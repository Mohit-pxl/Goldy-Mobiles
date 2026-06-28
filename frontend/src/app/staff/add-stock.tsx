import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Product } from "@/services/api";

type StockLine = { code: string; color?: string };

const trackingLabel = (product?: Product | null) => {
  const type = product?.trackingType || (product?.trackImei ? "IMEI" : product?.trackSerial ? "SERIAL" : "QUANTITY");
  if (type === "IMEI") return "IMEI";
  if (type === "SERIAL") return "Serial Number";
  return "Quantity Only";
};

export default function AddStockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { productId, scannedBarcode } = useLocalSearchParams<{ productId?: string; scannedBarcode?: string }>();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<StockLine[]>([]);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackingType = selectedProduct?.trackingType || (selectedProduct?.trackImei ? "IMEI" : selectedProduct?.trackSerial ? "SERIAL" : "QUANTITY");
  const isTracked = trackingType === "IMEI" || trackingType === "SERIAL";
  const colorOptions = useMemo(() => selectedProduct?.availableColors?.length ? selectedProduct.availableColors : ["Black", "White", "Blue", "Gold"], [selectedProduct]);

  useEffect(() => {
    if (!productId) return;
    apiGet<Product>(`/products/${productId}`)
      .then((res) => setSelectedProduct(res.data))
      .catch(() => Alert.alert("Error", "Could not load product."));
  }, [productId]);

  useEffect(() => {
    if (!scannedBarcode || !isTracked) return;
    addCode(scannedBarcode);
    router.setParams({ scannedBarcode: undefined });
  }, [scannedBarcode, isTracked]);

  const handleProductSearch = (q: string) => {
    setProductSearch(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setProducts([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiGet<Product[]>(`/products?search=${encodeURIComponent(q)}&limit=8`);
        setProducts(res.data || []);
      } catch {
        setProducts([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch("");
    setProducts([]);
    setLines([]);
    setQty("");
    Haptics.selectionAsync();
  };

  const addCode = (rawCode?: string) => {
    const code = (rawCode || manualCode).trim();
    if (!code) return;
    if (lines.some((line) => line.code === code)) {
      Alert.alert("Duplicate", `${trackingLabel(selectedProduct)} already added in this entry.`);
      return;
    }
    setLines((prev) => [...prev, { code, color: colorOptions[0] }]);
    setManualCode("");
  };

  const updateColor = (code: string, color: string) => {
    setLines((prev) => prev.map((line) => line.code === code ? { ...line, color } : line));
  };

  const removeCode = (code: string) => {
    setLines((prev) => prev.filter((line) => line.code !== code));
  };

  const submit = async () => {
    if (!selectedProduct) {
      Alert.alert("Select product", "Choose an existing product before adding stock.");
      return;
    }
    const count = isTracked ? lines.length : Number(qty);
    if (!count || count < 1) {
      Alert.alert("Quantity required", isTracked ? `Add at least one ${trackingLabel(selectedProduct)}.` : "Enter stock quantity.");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/stock/movements", {
        productId: selectedProduct._id,
        type: "in",
        qty: count,
        note: note || "Stock intake",
        items: isTracked ? lines : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.canGoBack() ? router.back() : router.replace("/(staff)/products");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(staff)/products")} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Add Stock</Text>
        <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}>
        <Text style={[styles.section, { color: colors.primary }]}>Product</Text>
        {selectedProduct ? (
          <View style={[styles.selectedCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: colors.foreground }]}>{selectedProduct.name}</Text>
              <Text style={[styles.productMeta, { color: colors.text3 }]}>{selectedProduct.brand} · {selectedProduct.category} · {trackingLabel(selectedProduct)}</Text>
            </View>
            <Pressable onPress={() => setSelectedProduct(null)} hitSlop={8}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.searchBox, { backgroundColor: colors.bg4 }]}>
              <Ionicons name="search" size={18} color={colors.text3} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search existing product"
                placeholderTextColor={colors.text3}
                value={productSearch}
                onChangeText={handleProductSearch}
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            {products.map((product) => (
              <Pressable key={product._id} style={[styles.resultRow, { borderColor: colors.border, backgroundColor: colors.bg2 }]} onPress={() => selectProduct(product)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                  <Text style={[styles.productMeta, { color: colors.text3 }]}>{product.brand} · Stock {product.stock} · {trackingLabel(product)}</Text>
                </View>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </>
        )}

        {selectedProduct && (
          <>
            <Text style={[styles.section, { color: colors.primary }]}>Inventory</Text>
            {isTracked ? (
              <View style={{ gap: 12 }}>
                <Pressable
                  style={[styles.scanBtn, { backgroundColor: colors.bg4, borderColor: colors.primary }]}
                  onPress={() => router.push({ pathname: "/staff/barcode-scanner", params: { returnMode: "barcode", returnPath: "/staff/add-stock", productId: selectedProduct._id, expectedCategory: trackingType === "IMEI" ? "IMEI" : "Serial" } })}
                >
                  <Ionicons name="scan" size={18} color={colors.primary} />
                  <Text style={[styles.scanText, { color: colors.primary }]}>Scan {trackingLabel(selectedProduct)}</Text>
                </Pressable>
                <View style={styles.entryRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder={`Enter ${trackingLabel(selectedProduct)}`}
                    placeholderTextColor={colors.text3}
                    onSubmitEditing={() => addCode()}
                  />
                  <Pressable style={[styles.smallBtn, { backgroundColor: colors.bg4, borderColor: colors.border2 }]} onPress={() => addCode()}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </Pressable>
                </View>
                {lines.map((line) => (
                  <View key={line.code} style={[styles.lineCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
                    <View style={styles.lineHeader}>
                      <Text style={[styles.codeText, { color: colors.foreground }]}>{line.code}</Text>
                      <Pressable onPress={() => removeCode(line.code)} hitSlop={8}>
                        <Ionicons name="close" size={18} color={colors.text3} />
                      </Pressable>
                    </View>
                    <View style={styles.colorRow}>
                      {colorOptions.map((color) => {
                        const active = line.color === color;
                        return (
                          <Pressable key={color} style={[styles.colorChip, { backgroundColor: active ? colors.primary : colors.bg3, borderColor: active ? colors.primary : colors.border2 }]} onPress={() => updateColor(line.code, color)}>
                            <Text style={{ color: active ? "#000" : colors.text2, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{color}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
                value={qty}
                onChangeText={setQty}
                keyboardType="numeric"
                placeholder="Stock quantity"
                placeholderTextColor={colors.text3}
              />
            )}
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.text3}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, minWidth: 56, alignItems: "center" },
  saveBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  section: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  selectedCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  productName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  productMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  resultRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 12 },
  scanText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  entryRow: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  smallBtn: { width: 44, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lineCard: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 10 },
  lineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  codeText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
});
