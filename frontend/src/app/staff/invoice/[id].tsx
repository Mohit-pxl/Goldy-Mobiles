import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, getApiUrl, Invoice } from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiGet<any>("/settings");
      return res.data;
    },
  });

  const queryClient = useQueryClient();
  const [markingPaid, setMarkingPaid] = React.useState(false);

  const isUnpaid = (inv as any)?.paymentStatus === "unpaid";

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const handleShare = () => {
    if (!inv) return;
    const lines = [
      `*Invoice ${inv.invoiceNumber}*`,
      `Date: ${fmtDate(inv.createdAt)}`,
      `Customer: ${inv.customer?.name || inv.customerName || "Walk-in"}`,
      ``,
      ...inv.items.map((i) => `• ${i.product.name} × ${i.qty} = ${fmt(i.subtotal)}`),
      ``,
      `Subtotal: ${fmt(inv.subtotal)}`,
      `GST: ${fmt(inv.gstAmount)}`,
      `*Total: ${fmt(inv.total)}*`,
      `Payment: ${inv.paymentMode.toUpperCase()}`,
      ``,
      `Goldy Mobiles`,
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

  const handleDownloadPDF = async () => {
    if (!inv) return;
    try {
      Alert.alert("Downloading...", "Please wait while the PDF is prepared.");
      const token = await AsyncStorage.getItem("auth_token");
      const url = `${getApiUrl()}/billing/invoices/${id}/pdf`;
      const fileUri = `${FileSystem.documentDirectory}invoice-${inv.invoiceNumber}.pdf`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (downloadRes.status !== 200) {
        throw new Error("Failed to download PDF.");
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert("Success", "PDF downloaded to app documents.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not download PDF.");
      console.error(e);
    }
  };

  const handlePrint = async () => {
    if (!inv) return;
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const url = `${getApiUrl()}/billing/invoices/${id}/pdf`;
      const fileUri = `${FileSystem.documentDirectory}invoice-${inv.invoiceNumber}.pdf`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (downloadRes.status !== 200) {
        throw new Error("Failed to prepare PDF for printing.");
      }

      await Print.printAsync({ uri: downloadRes.uri });
    } catch (e) {
      Alert.alert("Error", "Could not print PDF.");
      console.error(e);
    }
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

  const shopName = settings?.shopName || "Goldy Mobiles";
  const addressStr = settings?.address ? `${settings.address.street || ''} ${settings.address.city || ''} ${settings.address.state || ''} ${settings.address.pin || ''}`.trim() : "Vijay Nagar, Indore";
  const phone = settings?.phone || "";
  const gstin = settings?.gstNumber || "";
  const pan = settings?.panNumber || "";
  const bankDetails = settings?.bankDetails;
  const terms = settings?.termsAndConditions || "1. Customer will pay the GST\n2. Customer will pay the Delivery charges\n3. Pay due amount within 15 days";

  const totalQty = inv.items.reduce((sum, item) => sum + item.qty, 0);

  // Modern Accent color
  const accentColor = '#3b82f6'; // Clean soft blue
  const accentLight = '#eff6ff';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Topbar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text3} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>Invoice Details</Text>
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 16, paddingBottom: insets.bottom + 100 }}>
        {/* Paper Bill Container */}
        <View style={[styles.paper, { borderColor: colors.border2 }]}>
          {/* Header Row: Logo/Shop on left, Invoice Info on right */}
          <View style={styles.headerRow}>
            <View style={styles.shopBlock}>
              <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <View>
                <Text style={[styles.shopName, { color: accentColor }]}>{shopName}</Text>
                <Text style={styles.shopMeta}>{addressStr}</Text>
                <Text style={styles.shopMeta}>{phone ? `Phone: ${phone}` : ''}</Text>
                {gstin ? <Text style={styles.shopMeta}>GSTIN: {gstin}</Text> : null}
                {pan ? <Text style={styles.shopMeta}>PAN: {pan}</Text> : null}
              </View>
            </View>

            <View style={styles.invoiceInfoBlock}>
              <Text style={styles.invoiceLbl}>Invoice No.</Text>
              <Text style={[styles.invoiceVal, { color: accentColor }]}>{inv.invoiceNumber}</Text>
              
              <Text style={[styles.invoiceLbl, { marginTop: 8 }]}>Date</Text>
              <Text style={styles.invoiceVal}>{fmtDate(inv.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Bill To */}
          {(inv.customer?.name || inv.customerName) && (
            <View style={styles.billToSection}>
              <Text style={styles.sectionTitle}>Billed To:</Text>
              <Text style={styles.billToName}>{inv.customer?.name || inv.customerName}</Text>
              {(inv.customer?.phone || inv.customerPhone) ? <Text style={styles.billToMeta}>{inv.customer?.phone || inv.customerPhone}</Text> : null}
            </View>
          )}

          {/* Items Table */}
          <View style={[styles.table, { borderColor: colors.border2 }]}>
            <View style={[styles.thRow, { backgroundColor: accentLight }]}>
              <Text style={[styles.thCell, { flex: 0.5 }]}>#</Text>
              <Text style={[styles.thCell, { flex: 3 }]}>Item</Text>
              <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
            </View>
            
            {inv.items.map((item, i) => (
              <View key={i} style={[styles.tdRow, { borderBottomColor: colors.border2 }]}>
                <Text style={[styles.tdCell, { flex: 0.5 }]}>{i + 1}</Text>
                <View style={{ flex: 3 }}>
                  <Text style={styles.tdItemName}>{item.product.name}</Text>
                  <Text style={styles.tdItemSub}>GST {item.product?.gstPercent || 18}%</Text>
                </View>
                <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                <Text style={[styles.tdCell, { flex: 1.5, textAlign: 'right' }]}>{fmt(item.price)}</Text>
                <Text style={[styles.tdCell, { flex: 1.5, textAlign: 'right', fontWeight: '600' }]}>{fmt(item.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>Subtotal</Text>
                <Text style={styles.totalVal}>{fmt(inv.subtotal)}</Text>
              </View>
              {(inv.discount || 0) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLbl}>Discount</Text>
                  <Text style={[styles.totalVal, { color: '#ef4444' }]}>-{fmt(inv.discount || 0)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLbl}>Total Tax (GST)</Text>
                <Text style={styles.totalVal}>{fmt(inv.gstAmount)}</Text>
              </View>
              
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLbl}>Grand Total</Text>
                <Text style={styles.grandTotalVal}>{fmt(inv.total)}</Text>
              </View>

              {isUnpaid ? (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLbl}>Partial Amount Paid</Text>
                    <Text style={styles.totalVal}>{fmt(inv.paidAmount)}</Text>
                  </View>

                  <View style={[styles.totalRow, { marginTop: 4 }]}>
                    <Text style={[styles.totalLbl, { color: '#ef4444', fontWeight: '700' }]}>Due Balance</Text>
                    <Text style={[styles.totalVal, { color: '#ef4444', fontWeight: '700' }]}>{fmt(inv.dueAmount)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLbl}>Amount Paid</Text>
                  <Text style={styles.totalVal}>{fmt(inv.total)}</Text>
                </View>
              )}
              
              {inv.dueDate && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLbl}>Next Due Date</Text>
                  <Text style={styles.totalVal}>{fmtDate(inv.dueDate)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <View style={styles.footerCol}>
              <Text style={styles.sectionTitle}>Notes & Bank Details</Text>
              {bankDetails?.bankName ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.footerMeta}>Bank: {bankDetails.bankName}</Text>
                  <Text style={styles.footerMeta}>A/C: {bankDetails.accountNumber}</Text>
                  <Text style={styles.footerMeta}>IFSC: {bankDetails.ifscCode}</Text>
                </View>
              ) : (
                <Text style={styles.footerMeta}>Thank you for your business!</Text>
              )}
            </View>
            <View style={[styles.footerCol, { borderLeftWidth: 1, borderLeftColor: colors.border2, paddingLeft: 12 }]}>
              <Text style={styles.sectionTitle}>Terms & Conditions</Text>
              <Text style={[styles.footerMeta, { marginTop: 4 }]}>{terms}</Text>
            </View>
          </View>
        </View>

        {/* ── Actions Row ── */}
        <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.bg4, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handlePrint}
              >
                <Ionicons name="print-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Print</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.bg4, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleDownloadPDF}
              >
                <Ionicons name="download-outline" size={24} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Download</Text>
              </Pressable>
          <Pressable
            style={[styles.btnWa, { backgroundColor: "#25D366" }]}
            onPress={handleWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
            <Text style={styles.btnWaText}>Send</Text>
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

  paper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  shopMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  invoiceInfoBlock: {
    alignItems: 'flex-end',
  },
  invoiceLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invoiceVal: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  billToSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  billToName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  billToMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tdCell: {
    fontSize: 12,
    color: '#1e293b',
  },
  tdItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  tdItemSub: {
    fontSize: 11,
    color: '#64748b',
  },
  totalsContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLbl: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  totalVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  grandTotalLbl: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  footerSection: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerCol: {
    flex: 1,
  },
  footerMeta: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
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
