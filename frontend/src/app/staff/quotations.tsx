import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, Quotation } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {};

export default function QuotationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const statusStyles: Record<string, { bg: string; text: string }> = {
    draft: { bg: colors.bg4, text: colors.text2 },
    sent: { bg: colors.blueBg, text: colors.blueText },
    converted: { bg: colors.greenBg, text: colors.greenText },
    expired: { bg: colors.redBg, text: colors.redText },
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const res = await apiGet<Quotation[]>("/quotations");
      return res.data || [];
    },
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const quotations = data || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Quotations</Text>
        <Pressable style={[styles.newBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(staff)/billing?mode=quotation")}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : quotations.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No quotations" subtitle="Create a quotation for a customer" />
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(q) => q._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: q }) => {
            const sc = statusStyles[q.status] || statusStyles.draft;
            return (
              <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => router.push(`/staff/quotation/${q._id}`)}>
                <View style={styles.left}>
                  <Text style={[styles.qNum, { color: colors.foreground }]}>{q.quotationNumber}</Text>
                  <Text style={[styles.qDate, { color: colors.text3 }]}>{q.customer?.name || "Walk-in"} · {fmtDate(q.createdAt)}</Text>
                  <Text style={[styles.qItems, { color: colors.text3 }]}>{q.items.length} items</Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.qTotal, { color: colors.foreground }]}>{fmt(q.total)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{q.status.toUpperCase()}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  newBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  left: { flex: 1 },
  qNum: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  qDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  qItems: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  right: { alignItems: "flex-end", gap: 4 },
  qTotal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

