import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ActivityRow from "@/components/ActivityRow";
import MetricCard from "@/components/MetricCard";
import { SkeletonRow } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

interface DashboardData {
  todaySales: number;
  stockValue: number;
  lowStockCount: number;
  pendingDues: number;
  recentActivity: {
    type: "invoice" | "stock" | "alert";
    title: string;
    subtitle: string;
    time: string;
  }[];
}

export default function StaffDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: async () => {
      const [invoicesRes, productsRes] = await Promise.all([
        apiGet<{ total: number; count: number }>("/billing/invoices?limit=5&today=true"),
        apiGet<{ total: number; lowStock: number; stockValue: number }>("/products?summary=true"),
      ]);
      return {
        todaySales: (invoicesRes.data as { total?: number })?.total || 0,
        stockValue: (productsRes.data as { stockValue?: number })?.stockValue || 0,
        lowStockCount: (productsRes.data as { lowStock?: number })?.lowStock || 0,
        pendingDues: 0,
        recentActivity: [],
      } as DashboardData;
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ["recent-invoices"],
    queryFn: async () => {
      const res = await apiGet<{ invoiceNumber: string; customer?: { name: string }; items: { product: { name: string }; qty: number }[]; total: number; paymentMode: string; createdAt: string }[]>("/billing/invoices?limit=5");
      return res.data || [];
    },
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const recentInvoices = invoicesQuery.data || [];

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dashboard</Text>
          <Text style={[styles.headerSub, { color: colors.text3 }]}>{today}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.push("/staff/notifications")} style={{ position: 'relative', padding: 4 }}>
            <Ionicons name="notifications-outline" size={22} color={colors.text2} />
            <View style={{ position: 'absolute', top: 2, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive }} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 90 }}
      >
        {isLoading ? (
          <View style={{ gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard value={fmt(data?.todaySales || 0)} label="Today's sales" valueColor="accent" />
            {isAdmin && <MetricCard value={fmt(data?.stockValue || 0)} label="Stock value" />}
            {!isAdmin && <MetricCard value="—" label="Stock value" />}
            <MetricCard value={`${data?.lowStockCount || 0} items`} label="⚠ Low stock" valueColor="red" />
            <MetricCard value={fmt(data?.pendingDues || 0)} label="Pending dues" valueColor="red" />
          </View>
        )}

        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}
            onPress={() => router.push("/(staff)/billing")}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>New sale</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}
            onPress={() => router.push("/staff/add-product")}
          >
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Add product</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Recent activity</Text>

        {invoicesQuery.isLoading ? (
          <View>
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : recentInvoices.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text3 }]}>No recent activity</Text>
        ) : (
          <View style={[styles.activityBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            {recentInvoices.map((inv, i) => (
              <Pressable key={i} onPress={() => router.push(`/staff/invoice/${(inv as { _id?: string })._id || i}`)}>
                <ActivityRow
                  icon="🧾"
                  title={`${inv.invoiceNumber} · ${inv.customer?.name || "Walk-in"}`}
                  subtitle={`${inv.items[0]?.product?.name || "—"} · ${fmt(inv.total)} · ${inv.paymentMode}`}
                  time={getTimeAgo(inv.createdAt)}
                />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  activityBox: { borderRadius: 12, borderWidth: 1, padding: 4, paddingHorizontal: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },
});
