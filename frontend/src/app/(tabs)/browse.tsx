import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

// Static category definitions matching wireframe
const CATEGORIES = [
  { label: "Mobiles", icon: "📱", bg: "blue" as const },
  { label: "Audio & Earbuds", icon: "🎧", bg: "amber" as const },
  { label: "Wearables & Watches", icon: "⌚", bg: "green" as const },
  { label: "Tablets & iPads", icon: "💻", bg: "neutral" as const },
  { label: "Chargers & Cables", icon: "🔌", bg: "neutral" as const },
  { label: "Cases & Covers", icon: "🛡️", bg: "neutral" as const },
];

// Map wireframe category names → API category names
const CATEGORY_API_MAP: Record<string, string> = {
  "Mobiles": "Mobiles",
  "Audio & Earbuds": "Audio",
  "Wearables & Watches": "Smart Watches",
  "Tablets & iPads": "Laptops",
  "Chargers & Cables": "Chargers",
  "Cases & Covers": "Accessories",
};

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Fetch all products to compute per-category counts
  const { data } = useQuery({
    queryKey: ["catalog", "products", "all"],
    queryFn: async () => {
      const res = await apiGet<Product[]>("/catalog/products");
      return res.data;
    },
  });

  const products = data || [];

  // Compute product count per category
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [products]);

  const getCount = (label: string) => {
    const apiCat = CATEGORY_API_MAP[label] ?? label;
    return countMap[apiCat] ?? 0;
  };

  const filtered = CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  const thumbBg = (bg: string) => {
    switch (bg) {
      case "blue": return colors.blueBg ?? "#0d1b2b";
      case "amber": return colors.amberBg ?? "#2b1f0a";
      case "green": return colors.greenBg ?? "#0d2b1a";
      default: return colors.bg4 ?? "#2e2e2e";
    }
  };

  const handleCategoryPress = (label: string) => {
    const apiCat = CATEGORY_API_MAP[label] ?? label;
    router.push({ pathname: "/category-products", params: { category: apiCat, label } });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Browse</Text>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={15} color={colors.text3} />
        <TextInput
          style={[styles.searchInput, { color: colors.text3 }]}
          placeholder="Search all categories"
          placeholderTextColor={colors.text3}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category list */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((c) => (
          <Pressable
            key={c.label}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
            ]}
            onPress={() => handleCategoryPress(c.label)}
          >
            {/* Thumbnail */}
            <View style={[styles.thumb, { backgroundColor: thumbBg(c.bg) }]}>
              <Text style={styles.thumbIcon}>{c.icon}</Text>
            </View>

            {/* Text */}
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                {c.label}
              </Text>
              <Text style={[styles.rowSub, { color: colors.text3 }]}>
                {getCount(c.label)} products
              </Text>
            </View>

            {/* Chevron */}
            <Text style={[styles.chevron, { color: colors.text3 }]}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  list: {
    paddingHorizontal: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  thumbIcon: { fontSize: 20 },

  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },

  chevron: { fontSize: 18, fontWeight: "400" },
});
