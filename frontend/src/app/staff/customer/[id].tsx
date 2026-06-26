import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Customer, Invoice } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function CustomerLedgerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"cash" | "upi" | "card">("cash");

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await apiGet<Customer>(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["customer-invoices", id],
    queryFn: async () => {
      const res = await apiGet<Invoice[]>(`/billing/invoices?customerId=${id}`);
      return res.data || [];
    },
    enabled: !!id,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(payAmount);
      if (!amt || isNaN(amt) || amt <= 0) throw new Error("Please enter a valid amount.");
      await apiPost(`/customers/${id}/payments`, { amount: amt, paymentMode: payMode });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customer-invoices", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowPayModal(false);
      setPayAmount("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const inv = invoices || [];
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const totalDue = customer?.totalDue || 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Customer Ledger</Text>
        {customer?.phone && (
          <Pressable onPress={() => Linking.openURL(`https://wa.me/${customer.phone.replace(/\D/g, "")}`)} style={styles.iconBtn}>
            <Ionicons name="logo-whatsapp" size={22} color={colors.whatsapp} />
          </Pressable>
        )}
      </View>

      {customer && (
        <View style={[styles.customerCard, { backgroundColor: colors.bg2, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{customer.name[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text>
            <Text style={[styles.customerPhone, { color: colors.text3 }]}>{customer.phone}</Text>
          </View>
          <View style={[styles.dueBadge, { backgroundColor: totalDue > 0 ? colors.redBg : colors.greenBg }]}>
            <Text style={[styles.dueLabel, { color: totalDue > 0 ? colors.redText : colors.greenText }]}>
              {totalDue > 0 ? `Due: ${fmt(totalDue)}` : "Clear"}
            </Text>
          </View>
        </View>
      )}

      {totalDue > 0 && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowPayModal(true)}
          >
            <Ionicons name="cash-outline" size={16} color="#000" />
            <Text style={styles.payBtnText}>Record Payment</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={inv}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, paddingTop: 8 }}
        ListHeaderComponent={inv.length > 0 ? (
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{inv.length} transactions</Text>
        ) : null}
        ListEmptyComponent={isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={[styles.empty, { color: colors.text3 }]}>No transactions found</Text>
        )}
        renderItem={({ item: invoice }) => (
          <Pressable
            style={[styles.invRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/staff/invoice/${invoice._id}`)}
          >
            <View style={styles.invLeft}>
              <Text style={[styles.invNum, { color: colors.foreground }]}>{invoice.invoiceNumber}</Text>
              <Text style={[styles.invDate, { color: colors.text3 }]}>{fmtDate(invoice.createdAt)}</Text>
              <Text style={[styles.invItems, { color: colors.text3 }]}>{invoice.items.length} items</Text>
            </View>
            <View style={styles.invRight}>
              <Text style={[styles.invTotal, { color: colors.foreground }]}>
                {invoice.total < 0 ? `- ${fmt(Math.abs(invoice.total))}` : fmt(invoice.total)}
              </Text>
              <View style={[styles.modeBadge, { backgroundColor: invoice.paymentMode === "credit" ? colors.redBg : colors.greenBg }]}>
                <Text style={[styles.modeText, { color: invoice.paymentMode === "credit" ? colors.redText : colors.greenText }]}>
                  {invoice.paymentMode.toUpperCase()}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Record Payment</Text>
              <Pressable onPress={() => setShowPayModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text2} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                style={[styles.formInput, { flex: 1, color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
                placeholder="Amount (₹)"
                placeholderTextColor={colors.text3}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />
              <Pressable
                style={{ backgroundColor: colors.bg4, borderColor: colors.border2, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 9, borderWidth: 1 }}
                onPress={() => setPayAmount(String(customer?.totalDue || 0))}
              >
                <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Complete Due</Text>
              </Pressable>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text3 }]}>Payment Mode</Text>
            <View style={styles.modeRow}>
              {(["cash", "upi", "card"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: payMode === mode ? colors.primary : colors.bg3,
                      borderColor: payMode === mode ? colors.primary : colors.border2,
                      flex: 1,
                    },
                  ]}
                  onPress={() => setPayMode(mode)}
                >
                  <Text
                    style={{
                      color: payMode === mode ? "#000" : colors.text2,
                      fontWeight: "700",
                      fontFamily: "Inter_700Bold",
                      fontSize: 13,
                    }}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: payMutation.isPending ? 0.7 : 1 }]}
              onPress={() => payMutation.mutate()}
              disabled={payMutation.isPending || !payAmount}
            >
              {payMutation.isPending ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.submitText}>Save Payment</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  iconBtn: { padding: 4 },
  customerCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  customerPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dueBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  dueLabel: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  actionRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  payBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium", paddingBottom: 8 },
  invRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  invLeft: { flex: 1 },
  invNum: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  invDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  invItems: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  invRight: { alignItems: "flex-end", gap: 4 },
  invTotal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  modeText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  empty: { textAlign: "center", paddingTop: 40, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  formInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  submitText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});
