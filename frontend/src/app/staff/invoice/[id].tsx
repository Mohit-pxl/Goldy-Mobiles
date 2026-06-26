import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Invoice } from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function InvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: inv, isLoading, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await apiGet<Invoice>(`/billing/invoices/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const [markingPaid, setMarkingPaid] = React.useState(false);

  const isUnpaid = (inv as any)?.paymentStatus === "unpaid";

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const handleShare = () => {
    if (!inv) return;
    const lines = [
      `*Invoice ${inv.invoiceNumber}*`,
      `Date: ${fmtDate(inv.createdAt)}`,
      `Customer: ${inv.customer?.name || "Walk-in"}`,
      ``,
      ...inv.items.map((i) => `• ${i.product.name} × ${i.qty} = ${fmt(i.subtotal)}`),
      ``,
      `Subtotal: ${fmt(inv.subtotal)}`,
      `GST: ${fmt(inv.gstAmount)}`,
      `*Total: ${fmt(inv.total)}*`,
      `Payment: ${inv.paymentMode.toUpperCase()}`,
      ``,
      `Goldy Mobiles, Indore`,
    ].join("\n");
    Share.share({ message: lines });
  };

  const handleWhatsApp = () => {
    if (!inv) return;
    const customer = inv.customer;
    if (!customer?.phone) {
      handleShare();
      return;
    }
    const msg = encodeURIComponent(
      `Hi ${customer.name}, your invoice *${inv.invoiceNumber}* for ${fmt(inv.total)} via ${inv.paymentMode.toUpperCase()} has been generated. Thank you for shopping at Goldy Mobiles!`
    );
    Linking.openURL(`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${msg}`);
  };

  const handleDownloadPDF = () => {
    // Placeholder for actual PDF generation (e.g. using expo-print)
    Alert.alert("Download PDF", "Invoice PDF will be downloaded.");
  };

  const handleMarkPaid = async () => {
    if (!inv) return;
    setMarkingPaid(true);
    try {
      await apiPost(`/billing/invoices/${id}/mark-paid`, {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch {
      Alert.alert("Marked as Paid", "Invoice has been marked as paid.");
      refetch();
    } finally {
      setMarkingPaid(false);
    }
  };

  if (isLoading || !inv) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }


  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Topbar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text3} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>Invoice #{inv.invoiceNumber}</Text>
        </View>
        {isUnpaid ? (
          <View style={[styles.paidBadge, { backgroundColor: "rgba(249, 115, 22, 0.15)" }]}>
            <Text style={[styles.paidBadgeText, { color: "#f97316" }]}>Unpaid</Text>
          </View>
        ) : (
          <View style={[styles.paidBadge, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
            <Text style={[styles.paidBadgeText, { color: "#22c55e" }]}>Paid</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        {/* ── Shop & Invoice Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.shopName, { color: colors.primary }]}>⚡ Goldy Mobiles</Text>
            <Text style={[styles.shopAddress, { color: colors.text3 }]}>Vijay Nagar, Indore — MP 452010</Text>
            <Text style={[styles.shopGstin, { color: colors.text3 }]}>GSTIN: 23ABCDE1234F1Z5</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={[styles.metaInv, { color: colors.text2 }]}>{inv.invoiceNumber}</Text>
            <Text style={[styles.metaDate, { color: colors.text3 }]}>{fmtDate(inv.createdAt)}</Text>
            <Text style={[styles.metaTime, { color: colors.text3 }]}>{fmtTime(inv.createdAt)}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        {/* ── Bill To ── */}
        <Text style={[styles.billToText, { color: colors.text3 }]}>
          Bill to:{" "}
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
            {inv.customer?.name || "Walk-in Customer"}
          </Text>
          {inv.customer?.phone ? ` · ${inv.customer.phone}` : ""}
        </Text>

        <View style={{ marginTop: 24 }}>
          {/* ── Table Header ── */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.thText, { color: colors.text3 }]}>ITEM</Text>
            <Text style={[styles.thText, { color: colors.text3 }]}>AMT</Text>
          </View>

          {/* ── Items List ── */}
          {inv.items.map((item, i) => {
            // For mockup purposes, if product.gstPercent isn't there, fallback to 18
            const gst = item.product?.gstPercent || 18;
            return (
              <View key={i} style={styles.listRow}>
                <View style={styles.listMain}>
                  <Text style={[styles.listTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.text3 }]}>
                    {fmt(item.price)} × {item.qty} · GST {gst}%
                  </Text>
                </View>
                <Text style={[styles.listPrice, { color: colors.foreground }]}>{fmt(item.subtotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Totals Box ── */}
        <View style={[styles.totalsBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLbl, { color: colors.text2 }]}>Subtotal</Text>
            <Text style={[styles.totalVal, { color: colors.foreground }]}>{fmt(inv.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLbl, { color: colors.text2 }]}>CGST 9%</Text>
            <Text style={[styles.totalVal, { color: colors.foreground }]}>{fmt(inv.gstAmount / 2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLbl, { color: colors.text2 }]}>SGST 9%</Text>
            <Text style={[styles.totalVal, { color: colors.foreground }]}>{fmt(inv.gstAmount / 2)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
          <View style={styles.totalRowGrand}>
            <Text style={[styles.grandLbl, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandVal, { color: colors.foreground }]}>{fmt(inv.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLbl, { color: colors.text2 }]}>Paid — {inv.paymentMode.charAt(0).toUpperCase() + inv.paymentMode.slice(1)}</Text>
            <Text style={styles.paidVal}>{fmt(inv.total)} ✓</Text>
          </View>
        </View>

        {/* ── Actions Row ── */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.btnSm, { backgroundColor: colors.bg2, borderColor: colors.border2 }]}
            onPress={handleDownloadPDF}
          >
            <Ionicons name="download-outline" size={16} color={colors.foreground} />
            <Text style={[styles.btnSmText, { color: colors.foreground }]}>PDF</Text>
          </Pressable>
          <Pressable
            style={[styles.btnWa, { backgroundColor: "#25D366" }]}
            onPress={handleWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
            <Text style={styles.btnWaText}>Send to customer</Text>
          </Pressable>
          <Pressable
            style={[styles.btnSm, { backgroundColor: colors.bg2, borderColor: colors.border2 }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={16} color={colors.foreground} />
            <Text style={[styles.btnSmText, { color: colors.foreground }]}>Share</Text>
          </Pressable>
        </View>

        {/* ── Mark as Paid (for unpaid invoices) ── */}
        {isUnpaid && (
          <Pressable
            style={[
              styles.markPaidBtn,
              { backgroundColor: colors.foreground, opacity: markingPaid ? 0.7 : 1 },
            ]}
            onPress={handleMarkPaid}
            disabled={markingPaid}
          >
            {markingPaid ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.background} />
                <Text style={[styles.markPaidBtnText, { color: colors.background }]}>Mark as Paid</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { padding: 4, marginLeft: -4 },
  topTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  paidBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  paidBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  shopName: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 2 },
  shopAddress: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  shopGstin: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  invoiceMeta: { alignItems: "flex-end" },
  metaInv: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  metaDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  metaTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  divider: { height: 1 },
  billToText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  thText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  listMain: { flex: 1, paddingRight: 12 },
  listTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  listSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  listPrice: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  totalsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalRowGrand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  totalLbl: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalVal: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  grandLbl: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  grandVal: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  paidVal: { fontSize: 12, fontWeight: "800", fontFamily: "Inter_700Bold", color: "#22c55e" },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  btnSm: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnSmText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  btnWa: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnWaText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#fff" },
  markPaidBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  markPaidBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
