import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import { SkeletonRow } from "@/components/Skeleton";
import { useWishlist } from "@/context/WishlistContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const SORT_OPTIONS = ["Default", "Price: Low to High", "Price: High to Low", "Name A-Z"];

export default function CategoryProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { category, label } = useLocalSearchParams<{ category: string; label: string }>();
  const { toggle, isWishlisted } = useWishlist();

  const [sortBy, setSortBy] = useState("Default");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pendingBrands, setPendingBrands] = useState<string[]>([]);
  const [pendingInStock, setPendingInStock] = useState(false);
  const [pendingMin, setPendingMin] = useState("");
  const [pendingMax, setPendingMax] = useState("");

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const numColumns = isLargeScreen ? 3 : 2;
  const paddingH = 10;
  const gap = 8;
  const itemWidth = (width - paddingH * 2 - gap * (numColumns - 1)) / numColumns;

  const { data, isLoading } = useQuery({
    queryKey: ["catalog", "products", category],
    queryFn: async () => {
      const params = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await apiGet<Product[]>(`/catalog/products${params}`);
      return res.data;
    },
  });

  const products = data || [];

  // Derive unique brands from fetched products
  const allBrands = Array.from(new Set(products.map((p) => p.brand)));

  // Apply filters and sort
  let filtered = products.filter((p) => {
    if (inStockOnly && p.stock === 0) return false;
    if (activeBrands.length > 0 && !activeBrands.includes(p.brand)) return false;
    if (minPrice && p.sellingPrice < Number(minPrice)) return false;
    if (maxPrice && p.sellingPrice > Number(maxPrice)) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.brand.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (sortBy === "Price: Low to High") filtered = [...filtered].sort((a, b) => a.sellingPrice - b.sellingPrice);
  else if (sortBy === "Price: High to Low") filtered = [...filtered].sort((a, b) => b.sellingPrice - a.sellingPrice);
  else if (sortBy === "Name A-Z") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const openFilter = () => {
    setPendingBrands(activeBrands);
    setPendingInStock(inStockOnly);
    setPendingMin(minPrice);
    setPendingMax(maxPrice);
    setShowFilter(true);
  };

  const applyFilter = () => {
    setActiveBrands(pendingBrands);
    setInStockOnly(pendingInStock);
    setMinPrice(pendingMin);
    setMaxPrice(pendingMax);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setActiveBrands([]);
    setInStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setShowFilter(false);
  };

  const toggleBrand = (brand: string) => {
    setPendingBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const activeFilterCount = activeBrands.length + (inStockOnly ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={{ width: itemWidth }}>
      <ProductCard product={item} isWishlisted={isWishlisted(item._id)} onToggleWishlist={toggle} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border, backgroundColor: colors.bg2 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {label || category}
          </Text>
          <Text style={[styles.headerSub, { color: colors.text3 }]}>
            {isLoading ? "Loading..." : `${filtered.length} products`}
          </Text>
        </View>
        <Pressable onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }} hitSlop={8}>
          <Ionicons name={showSearch ? "close-outline" : "search-outline"} size={20} color={colors.text2} />
        </Pressable>
      </View>

      {/* Search bar (inline) */}
      {showSearch && (
        <View style={[styles.inlineSearch, { backgroundColor: colors.bg3, borderBottomColor: colors.border }]}>
          <Ionicons name="search-outline" size={14} color={colors.text3} />
          <TextInput
            style={[styles.inlineInput, { color: colors.foreground }]}
            placeholder={`Search in ${label || category}...`}
            placeholderTextColor={colors.text3}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={colors.text3} />
            </Pressable>
          )}
        </View>
      )}

      {/* Filter / Sort bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.bg2 }]}>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: colors.bg3, borderColor: activeFilterCount > 0 ? colors.primary : colors.border2 }]}
          onPress={openFilter}
        >
          <Ionicons name="options-outline" size={14} color={activeFilterCount > 0 ? colors.primary : colors.text2} />
          <Text style={[styles.filterBtnText, { color: activeFilterCount > 0 ? colors.primary : colors.text2 }]}>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterBtn, { backgroundColor: colors.bg3, borderColor: sortBy !== "Default" ? colors.primary : colors.border2 }]}
          onPress={() => setShowSort(true)}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={sortBy !== "Default" ? colors.primary : colors.text2} />
          <Text style={[styles.filterBtnText, { color: sortBy !== "Default" ? colors.primary : colors.text2 }]}>
            Sort
          </Text>
        </Pressable>

        {/* Active brand chips */}
        {activeBrands.map((b) => (
          <Pressable
            key={b}
            style={[styles.activeChip, { backgroundColor: colors.blueBg, borderColor: colors.blue }]}
            onPress={() => setActiveBrands((prev) => prev.filter((x) => x !== b))}
          >
            <Text style={[styles.activeChipText, { color: colors.blueText }]}>{b} ×</Text>
          </Pressable>
        ))}
      </View>

      {/* Product count row */}
      {!isLoading && (
        <View style={[styles.countRow, { backgroundColor: colors.background }]}>
          <Text style={[styles.countText, { color: colors.text3 }]}>
            {products.length} products · Showing {filtered.length}
          </Text>
        </View>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <View style={{ padding: 16, gap: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState icon="phone-portrait-outline" title="No products found" subtitle="Try adjusting your filters" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p._id}
          numColumns={numColumns}
          key={numColumns} // re-renders when columns change
          columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: paddingH, paddingTop: paddingH, paddingBottom: insets.bottom + 90, gap }}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilter} animationType="slide" transparent statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setShowFilter(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.bg2, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filter products</Text>

          {/* Brands */}
          {allBrands.length > 0 && (
            <>
              <Text style={[styles.sheetLabel, { color: colors.text3 }]}>Brand</Text>
              <View style={styles.chipRow}>
                {allBrands.map((b) => (
                  <Pressable
                    key={b}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: pendingBrands.includes(b) ? colors.primary : colors.bg3,
                        borderColor: pendingBrands.includes(b) ? colors.primary : colors.border2,
                      },
                    ]}
                    onPress={() => toggleBrand(b)}
                  >
                    <Text style={[styles.chipText, { color: pendingBrands.includes(b) ? "#000" : colors.text2 }]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Price range */}
          <Text style={[styles.sheetLabel, { color: colors.text3 }]}>Price range</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.priceInput, { backgroundColor: colors.bg3, borderColor: colors.border, color: colors.foreground }]}
              placeholder="₹ Min"
              placeholderTextColor={colors.text3}
              keyboardType="numeric"
              value={pendingMin}
              onChangeText={setPendingMin}
            />
            <Text style={[styles.priceTo, { color: colors.text3 }]}>to</Text>
            <TextInput
              style={[styles.priceInput, { backgroundColor: colors.bg3, borderColor: colors.border, color: colors.foreground }]}
              placeholder="₹ Max"
              placeholderTextColor={colors.text3}
              keyboardType="numeric"
              value={pendingMax}
              onChangeText={setPendingMax}
            />
          </View>

          {/* In stock toggle */}
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>In stock only</Text>
            <Pressable
              style={[styles.toggle, { backgroundColor: pendingInStock ? colors.green : colors.bg4 }]}
              onPress={() => setPendingInStock((v) => !v)}
            >
              <View style={[styles.toggleThumb, { left: pendingInStock ? 14 : 2 }]} />
            </Pressable>
          </View>

          {/* Action buttons */}
          <View style={styles.sheetActions}>
            <Pressable style={[styles.clearBtn, { borderColor: colors.border2 }]} onPress={clearFilter}>
              <Text style={[styles.clearBtnText, { color: colors.text2 }]}>Clear all</Text>
            </Pressable>
            <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={applyFilter}>
              <Text style={styles.applyBtnText}>Show {filtered.length} results</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSort} animationType="slide" transparent statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setShowSort(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.bg2, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.sortOption, { borderBottomColor: colors.border }]}
              onPress={() => { setSortBy(opt); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionText, { color: sortBy === opt ? colors.primary : colors.foreground }]}>{opt}</Text>
              {sortBy === opt && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, marginTop: 1, fontFamily: "Inter_400Regular" },

  inlineSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inlineInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },

  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  activeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  countRow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  countText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Filter sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sheetLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  priceTo: { fontSize: 12, fontFamily: "Inter_400Regular" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  toggle: { width: 36, height: 20, borderRadius: 10, justifyContent: "center", position: "relative" },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    position: "absolute",
    top: 2,
  },

  sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  applyBtn: {
    flex: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#000" },

  // Sort
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sortOptionText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

