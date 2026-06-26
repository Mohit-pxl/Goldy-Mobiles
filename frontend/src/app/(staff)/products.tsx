import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import ProductListRow from "@/components/ProductListRow";
import { SkeletonRow } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const FILTERS = ["All", "Mobiles", "Audio", "Smart Watches", "⚠ Low stock"];

export default function StaffProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const showCostPrice = user?.permissions?.canViewCostPrice || user?.role === "admin";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["staff-products", activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter === "⚠ Low stock") params.set("lowStock", "true");
      else if (activeFilter !== "All") params.set("category", activeFilter);
      const res = await apiGet<Product[]>(`/products?${params}`);
      return res.data || [];
    },
  });

  const products = (data || []).filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Products</Text>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/staff/add-product");
            }}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.fabText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.bg4 }]}>
            <Ionicons name="search" size={18} color={colors.text3} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search by name, SKU, barcode"
              placeholderTextColor={colors.text3}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.text3} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={[styles.filterScroll, { borderBottomColor: colors.border }]}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={[
                styles.chip,
                {
                  backgroundColor: activeFilter === f ? colors.primary : colors.bg3,
                  borderColor: activeFilter === f ? colors.primary : colors.border2,
                },
              ]}
              onPress={() => {
                if (activeFilter !== f) Haptics.selectionAsync();
                setActiveFilter(f);
              }}
            >
              <Text style={[styles.chipText, { color: activeFilter === f ? "#000" : colors.text2 }]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState icon="cube-outline" title="No products" subtitle={search ? "No products match your search" : "Tap + Add to add your first product"} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <ProductListRow
              product={item}
              showCostPrice={showCostPrice}
              onPress={() => router.push(`/staff/stock/${item._id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  fabText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  filterScroll: { borderBottomWidth: 1 },
  filterScrollContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12, paddingTop: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
});
