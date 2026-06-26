import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Quotation } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function QuotationDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: q, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      const res = await apiGet<Quotation>(`/quotations/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiPost<{ quotation: Quotation; invoice: { _id: string } }>(`/quotations/${id}/convert`, {});
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["quotation", id] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Quotation converted to invoice!", [
        { text: "View Invoice", onPress: () => router.replace(`/staff/invoice/${data.invoice._id}`) },
        { text: "OK" }
      ]);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const statusColors: Record<string, string> = {
    draft: colors.text2,
    sent: colors.blueText,
    converted: colors.greenText,
    expired: colors.redText,
  };

  if (isLoading || !q) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>{q.quotationNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg3 }]}>
          <Text style={[styles.statusText, { color: statusColors[q.status] || colors.text2 }]}>
            {q.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 100 }}>
        {q.customer && (
          <View style={[styles.customerBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={16} color={colors.text3} />
            <Text style={[styles.customerText, { color: colors.text2 }]}>
              {q.customer.name} · {q.customer.phone}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Items</Text>
        <View style={[styles.itemsBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          {q.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.product.name}</Text>
                <Text style={[styles.itemSub, { color: colors.text3 }]}>{fmt(item.price)} × {item.qty}</Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.foreground }]}>{fmt(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.totalsBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.grandLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandVal, { color: colors.primary }]}>{fmt(q.total)}</Text>
          </View>
        </View>
      </ScrollView>

      {q.status !== "converted" && (
        <View style={[styles.bottomBar, { backgroundColor: colors.bg2, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            style={[styles.convertBtn, { backgroundColor: colors.primary, opacity: convertMutation.isPending ? 0.7 : 1 }]}
            onPress={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="receipt-outline" size={18} color="#000" />
                <Text style={styles.convertBtnText}>Convert to invoice</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  iconBtn: { padding: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  customerBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  customerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  itemsBox: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalsBox: { borderWidth: 1, borderRadius: 12, padding: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  grandLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  grandVal: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  bottomBar: { padding: 14, borderTopWidth: 1 },
  convertBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 13 },
  convertBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
});
