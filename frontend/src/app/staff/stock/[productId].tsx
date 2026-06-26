import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StockBadge from "@/components/StockBadge";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Product, StockMovement } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function StockMovementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await apiGet<Product>(`/products/${productId}`);
      return res.data;
    },
    enabled: !!productId,
  });

  const movementsQuery = useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: async () => {
      const res = await apiGet<StockMovement[]>(`/stock/movements?productId=${productId}`);
      return res.data || [];
    },
    enabled: !!productId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiPost("/stock/movements", { productId, type, qty: Number(qty), note: note || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-movements", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      setShowAdd(false);
      setQty("");
      setNote("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const product = productQuery.data;
  const movements = movementsQuery.data || [];

  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const typeColor = (t: string) => t === "in" ? colors.greenText : t === "out" ? colors.redText : colors.amberText;
  const typeBg = (t: string) => t === "in" ? colors.greenBg : t === "out" ? colors.redBg : colors.amberBg;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Stock</Text>
        <Pressable onPress={() => router.push(`/staff/add-product?id=${productId}`)}>
          <Ionicons name="pencil-outline" size={20} color={colors.text2} />
        </Pressable>
      </View>

      {product && (
        <View style={[styles.productCard, { backgroundColor: colors.bg2, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
            <Text style={[styles.productSub, { color: colors.text3 }]}>{product.brand} · {product.category}</Text>
          </View>
          <View style={styles.stockInfo}>
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
            <Text style={[styles.stockNum, { color: colors.text3 }]}>{product.stock} pcs</Text>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.addBtn, { backgroundColor: colors.bg3, borderColor: colors.border2, margin: 14 }]}
        onPress={() => setShowAdd((v) => !v)}
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add stock movement</Text>
        <Ionicons name={showAdd ? "chevron-up" : "chevron-down"} size={16} color={colors.text3} />
      </Pressable>

      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.bg2, borderColor: colors.border, marginHorizontal: 14, marginBottom: 12 }]}>
          <View style={styles.typeRow}>
            {(["in", "out", "adjustment"] as const).map((t) => (
              <Pressable key={t} style={[styles.typeBtn, { backgroundColor: type === t ? typeBg(t) : colors.bg3, borderColor: type === t ? typeColor(t) : colors.border2 }]} onPress={() => setType(t)}>
                <Text style={{ color: type === t ? typeColor(t) : colors.text3, fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" }}>{t.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.bg3 }]} placeholder="Quantity" placeholderTextColor={colors.text3} keyboardType="numeric" value={qty} onChangeText={setQty} />
          <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.bg3 }]} placeholder="Note (optional)" placeholderTextColor={colors.text3} value={note} onChangeText={setNote} />
          <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: addMutation.isPending ? 0.7 : 1 }]} onPress={() => addMutation.mutate()} disabled={addMutation.isPending || !qty}>
            {addMutation.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitBtnText}>Submit</Text>}
          </Pressable>
        </View>
      )}

      <FlatList
        data={movements}
        keyExtractor={(m) => m._id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item: m }) => (
          <View style={[styles.movRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.movBadge, { backgroundColor: typeBg(m.type) }]}>
              <Text style={[styles.movBadgeText, { color: typeColor(m.type) }]}>
                {m.type === "in" ? "+" : m.type === "out" ? "-" : "~"}{m.qty}
              </Text>
            </View>
            <View style={styles.movInfo}>
              <Text style={[styles.movNote, { color: colors.foreground }]}>{m.note || m.type}</Text>
              <Text style={[styles.movSub, { color: colors.text3 }]}>{fmt(m.createdAt)}{m.staff ? ` · ${(m.staff as { name: string }).name}` : ""}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={[styles.empty, { color: colors.text3 }]}>No stock movements yet</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  iconBtn: { padding: 4 },
  productCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  productName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  productSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  stockInfo: { alignItems: "flex-end", gap: 4 },
  stockNum: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  addBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  addForm: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  submitBtn: { borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  movRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  movBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, minWidth: 48, alignItems: "center" },
  movBadgeText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  movInfo: { flex: 1 },
  movNote: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  movSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { textAlign: "center", paddingTop: 32, fontFamily: "Inter_400Regular" },
});
