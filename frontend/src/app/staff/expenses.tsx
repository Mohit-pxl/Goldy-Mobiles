import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import MetricCard from "@/components/MetricCard";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, apiDelete, Expense } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const EXPENSE_CATEGORIES = ["Rent", "Salary", "Electric", "Transport", "Other"];

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "Other" });
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"Monthly" | "Yearly">("Monthly");
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await apiGet<Expense[]>("/expenses");
      return res.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim() || !form.amount || isNaN(Number(form.amount))) {
        throw new Error("Enter description and valid amount.");
      }
      if (editExpenseId) {
        await apiPatch(`/expenses/${editExpenseId}`, {
          description: form.description.trim(),
          amount: Number(form.amount),
          category: form.category,
        });
      } else {
        await apiPost("/expenses", {
          description: form.description.trim(),
          amount: Number(form.amount),
          category: form.category,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setShowModal(false);
      setForm({ description: "", amount: "", category: "Other" });
      setEditExpenseId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/expenses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteExpenseId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const allExpenses = data || [];
  
  const filteredExpenses = allExpenses.filter(e => {
    const d = new Date(e.date || e.createdAt);
    if (viewMode === "Yearly") return d.getFullYear() === year;
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const yearTotal = allExpenses.filter(e => new Date(e.date || e.createdAt).getFullYear() === year).reduce((s, e) => s + e.amount, 0);
  const monthTotal = allExpenses.filter(e => {
    const d = new Date(e.date || e.createdAt);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  }).reduce((s, e) => s + e.amount, 0);
  
  const currentTotal = viewMode === "Yearly" ? yearTotal : monthTotal;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Expenses</Text>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => {
          setEditExpenseId(null);
          setForm({ description: "", amount: "", category: "Other" });
          setShowModal(true);
        }}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={[styles.periodRow, { borderBottomColor: colors.border }]}>
        {["Monthly", "Yearly"].map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, { backgroundColor: viewMode === p ? colors.primary : colors.bg3, borderColor: viewMode === p ? colors.primary : colors.border2 }]}
            onPress={() => setViewMode(p as any)}
          >
            <Text style={[styles.periodText, { color: viewMode === p ? "#000" : colors.text2 }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(e) => e._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="wallet-outline" title="No expenses" subtitle="Track your shop expenses here" />
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                 <Pressable onPress={() => {
                   if (viewMode === "Yearly") setYear(y => y - 1);
                   else {
                     if (month === 1) { setMonth(12); setYear(y => y - 1); }
                     else { setMonth(m => m - 1); }
                   }
                 }} style={{ padding: 6 }}>
                    <Ionicons name="chevron-back" size={20} color={colors.text2} />
                 </Pressable>
                 <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                   {viewMode === "Yearly" ? `Year ${year}` : new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                 </Text>
                 <Pressable onPress={() => {
                   if (viewMode === "Yearly") setYear(y => y + 1);
                   else {
                     if (month === 12) { setMonth(1); setYear(y => y + 1); }
                     else { setMonth(m => m + 1); }
                   }
                 }} style={{ padding: 6 }}>
                    <Ionicons name="chevron-forward" size={20} color={colors.text2} />
                 </Pressable>
              </View>

              <View style={styles.metricsGrid}>
                <MetricCard value={fmt(yearTotal)} label="This year" />
                <MetricCard value={fmt(monthTotal)} label="This month" />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.text3 }]}>By category — {viewMode === "Yearly" ? year : new Date(year, month - 1).toLocaleString('default', { month: 'short' })}</Text>
              <View style={{ gap: 8, marginTop: 12, marginBottom: 16 }}>
                {EXPENSE_CATEGORIES.map((c, i) => {
                  const catTotal = filteredExpenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0);
                  if (catTotal === 0 && filteredExpenses.length > 0) return null; 
                  const pct = currentTotal > 0 ? (catTotal / currentTotal) * 100 : 0;
                  return (
                    <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 11, color: colors.text3, width: 60, fontFamily: "Inter_500Medium" }}>{c}</Text>
                      <View style={{ flex: 1, height: 8, backgroundColor: colors.bg4, borderRadius: 4 }}>
                        <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 4, opacity: 1 - (i * 0.15) }} />
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, width: 55, textAlign: 'right', fontFamily: "Inter_600SemiBold" }}>
                        {fmt(catTotal)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 8 }} />
            </View>
          }
          renderItem={({ item: exp }) => {
            let icon = "wallet-outline";
            if (exp.category === "Rent") icon = "business-outline";
            if (exp.category === "Electric") icon = "flash-outline";
            if (exp.category === "Salary") icon = "people-outline";
            if (exp.category === "Transport") icon = "car-outline";

            return (
              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={[styles.catDot, { backgroundColor: colors.bg4 }]}>
                  <Ionicons name={icon as any} size={16} color={colors.foreground} />
                </View>
                <View style={styles.expInfo}>
                  <Text style={[styles.expDesc, { color: colors.foreground }]}>{exp.description}</Text>
                  <Text style={[styles.expSub, { color: colors.text3 }]}>
                    {fmtDate(exp.date || exp.createdAt)}
                    {exp.updatedAt ? ` · Edited ${fmtDate(exp.updatedAt)}` : ' · Added by Admin'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[styles.expAmount, { color: colors.foreground }]}>{fmt(exp.amount)}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={() => {
                       setEditExpenseId(exp._id);
                       setForm({ description: exp.description, amount: String(exp.amount), category: exp.category });
                       setShowModal(true);
                    }}>
                      <Ionicons name="pencil" size={14} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => setDeleteExpenseId(exp._id)}>
                      <Ionicons name="trash" size={14} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editExpenseId ? "Edit Expense" : "Add Expense"}</Text>
              <Pressable onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text2} />
              </Pressable>
            </View>
            <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Description" placeholderTextColor={colors.text3} value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
            <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Amount" placeholderTextColor={colors.text3} keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} />
            <Text style={[styles.fieldLabel, { color: colors.text3 }]}>Category</Text>
            <View style={styles.catRow}>
              {EXPENSE_CATEGORIES.map((c) => (
                <Pressable key={c} style={[styles.catChip, { backgroundColor: form.category === c ? colors.primary : colors.bg3, borderColor: form.category === c ? colors.primary : colors.border2 }]} onPress={() => setForm((p) => ({ ...p, category: c }))}>
                  <Text style={{ color: form.category === c ? "#000" : colors.text2, fontSize: 11, fontFamily: "Inter_500Medium" }}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saveMutation.isPending ? 0.7 : 1 }]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitText}>Save expense</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteExpenseId} transparent animationType="fade" onRequestClose={() => setDeleteExpenseId(null)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border, width: '85%', borderRadius: 16 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.redBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="trash" size={24} color={colors.redText} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', color: colors.foreground }}>Delete Expense?</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.text2, textAlign: 'center', marginTop: 8 }}>This action cannot be undone. Are you sure you want to delete this expense?</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' }} onPress={() => setDeleteExpenseId(null)}>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text2 }}>Cancel</Text>
              </Pressable>
              <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.destructive, alignItems: 'center' }} onPress={() => deleteExpenseId && deleteMutation.mutate(deleteExpenseId)}>
                {deleteMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff' }}>Delete</Text>}
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
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  periodRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  periodBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  periodText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metricsGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sectionLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  catDot: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expInfo: { flex: 1 },
  expDesc: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  expSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  expAmount: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  formInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  submitBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  submitText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});

