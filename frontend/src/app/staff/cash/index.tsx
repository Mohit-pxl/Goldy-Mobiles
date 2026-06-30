import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useAdjustCash, useCashSummary, useCashTransactions } from "@/services/queries/useCash";
import { SkeletonRow } from "@/components/Skeleton";

export default function CashScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary, isRefetching: refetchingSummary } = useCashSummary();
  const { data: txData, isLoading: loadingTx, refetch: refetchTx, isRefetching: refetchingTx } = useCashTransactions(1);
  const adjustMutation = useAdjustCash();

  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const fmt = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const transactions = txData || [];

  const handleAdjust = () => {
    const amount = parseFloat(adjustAmount);
    if (!isNaN(amount)) {
      adjustMutation.mutate({ amount, note: adjustNote }, {
        onSuccess: () => {
          setAdjustModal(false);
          setAdjustAmount("");
          setAdjustNote("");
        }
      });
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'cash_sale': return { name: 'arrow-down', color: colors.green };
      case 'bank_sale': return { name: 'arrow-down', color: colors.accent };
      case 'cash_expense': return { name: 'arrow-up', color: colors.destructive };
      case 'bank_deposit': return { name: 'business', color: colors.primary };
      case 'manual_adjustment': return { name: 'options', color: colors.text3 };
      default: return { name: 'swap-vertical', color: colors.text3 };
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cash and bank</Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refetchingSummary || refetchingTx} onRefresh={() => { refetchSummary(); refetchTx(); }} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {/* Balances */}
            <View style={styles.cardsRow}>
              <View style={[styles.balanceCard, { backgroundColor: colors.green + '15' }]}>
                <Ionicons name="cash-outline" size={20} color={colors.green} style={{ marginBottom: 4 }} />
                <Text style={[styles.balanceLabel, { color: colors.text2 }]}>Cash in hand</Text>
                {loadingSummary ? <SkeletonRow /> : <Text style={[styles.balanceVal, { color: colors.green }]}>{fmt(summary?.cashInHand)}</Text>}
              </View>
              <View style={[styles.balanceCard, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="business-outline" size={20} color={colors.accent} style={{ marginBottom: 4 }} />
                <Text style={[styles.balanceLabel, { color: colors.text2 }]}>In account</Text>
                {loadingSummary ? <SkeletonRow /> : <Text style={[styles.balanceVal, { color: colors.accent }]}>{fmt(summary?.bankBalance)}</Text>}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/staff/cash/deposit" as any)}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Deposit to bank</Text>
              </Pressable>
              {isAdmin && (
                <Pressable
                  style={[styles.btn, styles.btnOutline, { borderColor: colors.border }]}
                  onPress={() => setAdjustModal(true)}
                >
                  <Text style={[styles.btnText, { color: colors.foreground }]}>Adjust</Text>
                </Pressable>
              )}
            </View>

            {/* Today's Breakdown */}
            <View style={[styles.breakdownBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Breakdown</Text>
              {loadingSummary ? (
                <SkeletonRow />
              ) : (
                <View style={{ gap: 8, marginTop: 12 }}>
                  <View style={styles.breakdownRow}>
                    <Text style={{ color: colors.text2 }}>Cash sales</Text>
                    <Text style={{ color: colors.green, fontWeight: '600' }}>{fmt(summary?.todayBreakdown?.cashSales)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={{ color: colors.text2 }}>UPI / Card sales</Text>
                    <Text style={{ color: colors.accent, fontWeight: '600' }}>{fmt(summary?.todayBreakdown?.bankSales)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={{ color: colors.text2 }}>Cash expenses</Text>
                    <Text style={{ color: colors.destructive, fontWeight: '600' }}>-{fmt(summary?.todayBreakdown?.cashExpenses)}</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Recent Transactions</Text>
          </View>
        }
        renderItem={({ item }) => {
          const icon = getTxIcon(item.type);
          return (
            <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.txIconBox, { backgroundColor: colors.bg3 }]}>
                <Ionicons name={icon.name as any} size={18} color={icon.color} />
              </View>
              <View style={styles.txContent}>
                <Text style={[styles.txNote, { color: colors.foreground }]} numberOfLines={1}>{item.note || item.type}</Text>
                <Text style={[styles.txSub, { color: colors.text3 }]}>
                  {item.createdBy?.name} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: item.amount >= 0 ? colors.green : colors.destructive }]}>
                {item.amount > 0 ? '+' : ''}{fmt(item.amount)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          loadingTx ? <SkeletonRow /> : <Text style={[styles.emptyText, { color: colors.text3 }]}>No transactions found</Text>
        }
      />

      {/* Adjust Modal */}
      <Modal visible={adjustModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg2 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adjust Cash Balance</Text>
            <Text style={[styles.modalSub, { color: colors.text2 }]}>Use a negative number to subtract missing cash.</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Amount (e.g. -500 or 100)"
              placeholderTextColor={colors.text3}
              keyboardType="numbers-and-punctuation"
              value={adjustAmount}
              onChangeText={setAdjustAmount}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Note / Reason"
              placeholderTextColor={colors.text3}
              value={adjustNote}
              onChangeText={setAdjustNote}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnOutline, { flex: 1, borderColor: colors.border }]} onPress={() => setAdjustModal(false)}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary, { flex: 1, backgroundColor: colors.primary }]} onPress={handleAdjust}>
                <Text style={{ color: '#fff' }}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  cardsRow: { flexDirection: 'row', gap: 12 },
  balanceCard: { flex: 1, padding: 16, borderRadius: 12 },
  balanceLabel: { fontSize: 13, marginBottom: 4 },
  balanceVal: { fontSize: 22, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: {},
  btnOutline: { borderWidth: 1 },
  btnText: { fontWeight: '600', fontSize: 14 },
  breakdownBox: { padding: 16, borderRadius: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  txIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txContent: { flex: 1 },
  txNote: { fontSize: 14, fontWeight: '500' },
  txSub: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 12, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSub: { fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
});
