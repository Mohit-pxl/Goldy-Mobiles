import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkeletonRow } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch, ProfitLossReport, SalesReport, StaffUser } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtShort = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  /* ── Stats ── */
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [sales, pl, products, customers, staff] = await Promise.all([
        apiGet<SalesReport>("/reports/sales?period=month").catch(() => ({ data: null })),
        apiGet<ProfitLossReport>("/reports/profit-loss?period=month").catch(() => ({ data: null })),
        apiGet<{ total: number; lowStock: number; stockValue: number }>("/products?summary=true").catch(() => ({ data: null })),
        apiGet<{ count: number }>("/customers?count=true").catch(() => ({ data: null })),
        apiGet<StaffUser[]>("/staff").catch(() => ({ data: [] })),
      ]);
      return { sales: sales.data, pl: pl.data, products: products.data, customers: customers.data, staff: staff.data };
    },
  });

  const { data, isLoading, refetch, isRefetching } = statsQuery;
  const staffList: StaffUser[] = (data?.staff as StaffUser[] | null) || [];

  /* ── Toggle staff active ── */
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiPatch(`/staff/${id}`, { isActive });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-stats"] }),
    onError: () => Alert.alert("Error", "Could not update staff status."),
  });

  const StatCard = ({
    label,
    value,
    sub,
    icon,
    accent,
    onPress,
  }: {
    label: string;
    value: string;
    sub?: string;
    icon: string;
    accent?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      style={[styles.statCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: accent || colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text3 }]}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.text3 }]}>{sub}</Text>}
    </Pressable>
  );

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{title}</Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin Panel</Text>
          <Text style={[styles.sub, { color: colors.text3 }]}>Goldy Mobiles · Full access</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.adminBadge, { backgroundColor: colors.redBg, borderColor: colors.redText + "44" }]}>
            <Ionicons name="shield-checkmark" size={12} color={colors.redText} />
            <Text style={[styles.adminBadgeText, { color: colors.redText }]}>ADMIN</Text>
          </View>
          <Pressable onPress={() => router.push("/staff/notifications")} style={{ position: 'relative', padding: 4 }}>
            <Ionicons name="notifications-outline" size={22} color={colors.text2} />
            <View style={{ position: 'absolute', top: 2, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive }} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Overview stats ── */}
        <Section title="This Month" />

        {isLoading ? (
          <View style={{ gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              icon="💰"
              label="Revenue"
              value={fmtShort((data?.sales as SalesReport | null)?.totalSales || 0)}
              sub={`${(data?.sales as SalesReport | null)?.totalOrders || 0} orders`}
              accent={colors.primary}
            />
            <StatCard
              icon="📈"
              label="Net Profit"
              value={fmtShort((data?.pl as ProfitLossReport | null)?.netProfit || 0)}
              sub={
                (data?.pl as ProfitLossReport | null)?.netProfit !== undefined && (data?.pl as ProfitLossReport | null)?.revenue
                  ? `${(((data?.pl as ProfitLossReport).netProfit / (data?.pl as ProfitLossReport).revenue) * 100).toFixed(1)}% margin`
                  : "—"
              }
              accent={colors.greenText}
            />
            <StatCard
              icon="📦"
              label="Stock value"
              value={fmtShort((data?.products as { stockValue?: number } | null)?.stockValue || 0)}
              sub={`${(data?.products as { lowStock?: number } | null)?.lowStock || 0} low stock`}
            />
            <StatCard
              icon="👥"
              label="Customers"
              value={String((data?.customers as { count?: number } | null)?.count || 0)}
              onPress={() => router.push("/staff/khata")}
            />
          </View>
        )}

        {/* ── Quick actions ── */}
        <Section title="Quick Actions" />
        <View style={styles.actionsGrid}>
          {[
            { icon: "bar-chart-outline", label: "Reports", path: "/staff/reports" as const },
            { icon: "people-circle-outline", label: "Staff Mgmt", path: "/staff/staff-mgmt" as const },
            { icon: "person-add-outline", label: "Users Mgmt", path: "/staff/users-mgmt" as const },
            { icon: "wallet-outline", label: "Expenses", path: "/staff/expenses" as const },
            { icon: "document-text-outline", label: "Quotations", path: "/staff/quotations" as const },
            { icon: "people-outline", label: "Khata", path: "/staff/khata" as const },
            { icon: "add-circle-outline", label: "New Sale", path: "/(staff)/billing" as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={[styles.actionBtn, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}
              onPress={() => router.push(item.path)}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.text2 }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Profit & Loss breakdown ── */}
        {data?.pl && (
          <>
            <Section title="P&L Breakdown" />
            <View style={[styles.plBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              {[
                { label: "Revenue", value: (data.pl as ProfitLossReport).revenue, color: colors.primary },
                { label: "Cost of Goods", value: -(data.pl as ProfitLossReport).costOfGoods, color: colors.redText },
                { label: "Gross Profit", value: (data.pl as ProfitLossReport).grossProfit, color: colors.greenText },
                { label: "Expenses", value: -(data.pl as ProfitLossReport).expenses, color: colors.redText },
                { label: "Net Profit", value: (data.pl as ProfitLossReport).netProfit, color: colors.amberText, bold: true },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={[
                    styles.plRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      ...(row.bold ? { paddingTop: 10 } : {}),
                    },
                  ]}
                >
                  <Text style={[styles.plLabel, { color: row.bold ? colors.foreground : colors.text2, fontFamily: row.bold ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {row.label}
                  </Text>
                  <Text style={[styles.plValue, { color: row.color, fontFamily: row.bold ? "Inter_700Bold" : "Inter_600SemiBold" }]}>
                    {row.value >= 0 ? fmt(row.value) : `−${fmt(Math.abs(row.value))}`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Staff overview ── */}
        <Section title={`Staff (${staffList.length})`} />
        {isLoading ? (
          <SkeletonRow />
        ) : staffList.length === 0 ? (
          <Pressable
            style={[styles.emptyStaff, { borderColor: colors.border, backgroundColor: colors.bg3 }]}
            onPress={() => router.push("/staff/staff-mgmt")}
          >
            <Ionicons name="people-circle-outline" size={24} color={colors.text3} />
            <Text style={[styles.emptyStaffText, { color: colors.text3 }]}>No staff yet — tap to add</Text>
          </Pressable>
        ) : (
          <View style={[styles.staffBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            {staffList.slice(0, 5).map((s, i) => (
              <View
                key={s._id}
                style={[
                  styles.staffRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < Math.min(staffList.length, 5) - 1 ? 1 : 0,
                  },
                ]}
              >
                <View style={[styles.staffAvatar, { backgroundColor: s.role === "admin" ? colors.redBg : colors.bg4 }]}>
                  <Text style={[styles.staffAvatarText, { color: s.role === "admin" ? colors.redText : colors.primary }]}>
                    {s.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={[styles.staffName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.staffMeta, { color: colors.text3 }]}>
                    {s.role} · {s.email}
                  </Text>
                </View>
                <Switch
                  value={s.isActive}
                  onValueChange={(v) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleMutation.mutate({ id: s._id, isActive: v });
                  }}
                  trackColor={{ false: colors.bg4, true: colors.primary + "66" }}
                  thumbColor={s.isActive ? colors.primary : colors.text3}
                />
              </View>
            ))}
            {staffList.length > 5 && (
              <Pressable
                style={[styles.viewAllBtn, { borderTopColor: colors.border }]}
                onPress={() => router.push("/staff/staff-mgmt")}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View all {staffList.length} staff members →
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Permissions reference ── */}
        <Section title="Your permissions" />
        <View style={[styles.permsBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          {[
            { label: "View cost price", granted: user?.permissions?.canViewCostPrice },
            { label: "Edit prices", granted: user?.permissions?.canEditPrice },
            { label: "View reports", granted: user?.permissions?.canViewReports },
            { label: "Manage staff", granted: user?.permissions?.canManageStaff },
          ].map((p, i, arr) => (
            <View
              key={p.label}
              style={[
                styles.permRow,
                { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 },
              ]}
            >
              <Text style={[styles.permLabel, { color: colors.text2 }]}>{p.label}</Text>
              <View style={[styles.permPill, { backgroundColor: p.granted ? colors.greenBg : colors.redBg }]}>
                <Ionicons
                  name={p.granted ? "checkmark-circle" : "close-circle"}
                  size={13}
                  color={p.granted ? colors.greenText : colors.redText}
                />
                <Text style={[styles.permText, { color: p.granted ? colors.greenText : colors.redText }]}>
                  {p.granted ? "Granted" : "Denied"}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_500Medium",
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 3,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    width: "31%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  actionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  plBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, overflow: "hidden" },
  plRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11 },
  plLabel: { fontSize: 13 },
  plValue: { fontSize: 13 },
  staffBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  staffMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  viewAllBtn: { borderTopWidth: 1, paddingVertical: 12, alignItems: "center" },
  viewAllText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyStaff: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyStaffText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  permsBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, overflow: "hidden" },
  permRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  permLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  permPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  permText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
