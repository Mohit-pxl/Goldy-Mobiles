import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiDelete, Customer } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export default function KhataScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Due" | "Clear">("All");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await apiGet<Customer[]>("/customers");
      return res.data || [];
    },
  });

  const customers = (data || []).filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    if (!matchSearch) return false;
    const isClear = (c.totalDue || 0) <= 0;
    if (filter === "Due" && isClear) return false;
    if (filter === "Clear" && !isClear) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const selectAll = () => {
    const clearCustomers = customers.filter(c => (c.totalDue || 0) <= 0).map(c => c._id);
    if (selected.size === clearCustomers.length && clearCustomers.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clearCustomers));
    }
  };

  const executeDelete = async () => {
    try {
      for (const id of Array.from(selected)) {
        await apiDelete(`/customers/${id}`);
      }
      refetch();
      setSelected(new Set());
      setIsSelectMode(false);
    } catch (error) {
      Alert.alert("Error", "Failed to delete customers");
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${selected.size} customer(s)? This action cannot be undone.`)) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        "Delete Customers",
        `Are you sure you want to delete ${selected.size} customer(s)? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: executeDelete
          }
        ]
      );
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const totalDue = customers.reduce((s, c) => s + (c.totalDue || 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Khata / Ledger</Text>
          {totalDue > 0 && (
            <Text style={[styles.totalDue, { color: colors.redText }]}>Total due: {fmt(totalDue)}</Text>
          )}
        </View>
        {filter === "Clear" && (
          <Pressable onPress={() => { setIsSelectMode(!isSelectMode); setSelected(new Set()); }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
              {isSelectMode ? "Cancel" : "Select"}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.text3} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or phone"
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {["All", "Due", "Clear"].map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterChip, 
                { borderColor: colors.border2 },
                filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => { setFilter(f as any); setIsSelectMode(false); setSelected(new Set()); }}
            >
              <Text style={[styles.filterText, { color: colors.text2 }, filter === f && { color: "#000", fontFamily: "Inter_600SemiBold" }]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        {isSelectMode && filter === "Clear" && (
          <View style={styles.actionRow}>
            <Pressable onPress={selectAll}>
               <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                 {selected.size === customers.filter(c => (c.totalDue || 0) <= 0).length && customers.length > 0 ? "Deselect All" : "Select All"}
               </Text>
            </Pressable>
            <Pressable onPress={deleteSelected} disabled={selected.size === 0} style={{ opacity: selected.size === 0 ? 0.5 : 1 }}>
               <Text style={{ color: colors.redText, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                 Delete ({selected.size})
               </Text>
            </Pressable>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : customers.length === 0 ? (
        <EmptyState icon="people-outline" title="No customers" subtitle="Customers with credit purchases appear here" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c._id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: c }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => {
                if (isSelectMode && (c.totalDue || 0) <= 0) {
                  toggleSelect(c._id);
                } else {
                  router.push(`/staff/customer/${c._id}`);
                }
              }}
              onLongPress={() => {
                if ((c.totalDue || 0) <= 0 && !isSelectMode) {
                  setFilter("Clear");
                  setIsSelectMode(true);
                  setSelected(new Set([c._id]));
                }
              }}
            >
              {isSelectMode && (c.totalDue || 0) <= 0 && (
                <Ionicons
                  name={selected.has(c._id) ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected.has(c._id) ? colors.primary : colors.text3}
                  style={{ marginRight: 6 }}
                />
              )}
              <View style={[styles.avatar, { backgroundColor: colors.bg3 }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {c.name[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[styles.phone, { color: colors.text3 }]}>{c.phone}</Text>
              </View>
              {(c.totalDue || 0) > 0 ? (
                <View style={[styles.dueBadge, { backgroundColor: colors.redBg }]}>
                  <Text style={[styles.dueText, { color: colors.redText }]}>{fmt(c.totalDue!)}</Text>
                </View>
              ) : (
                <View style={[styles.dueBadge, { backgroundColor: colors.greenBg }]}>
                  <Text style={[styles.dueText, { color: colors.greenText }]}>Clear</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.text3} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalDue: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  searchRow: { padding: 12, borderBottomWidth: 1, gap: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  phone: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  dueBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  dueText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

