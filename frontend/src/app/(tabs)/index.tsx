import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import { SkeletonRow } from "@/components/Skeleton";
import { useWishlist } from "@/context/WishlistContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, Product, Banner } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = ["All", "Mobiles", "Audio", "Earphones", "Chargers", "Smart Watches", "Laptops"];

export default function CustomerHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toggle, isWishlisted } = useWishlist();
  const [activeCategory, setActiveCategory] = useState("All");

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const numColumns = isLargeScreen ? 3 : 2;
  const paddingHorizontal = 10;
  const gap = 8;
  const availableWidth = width - (paddingHorizontal * 2) - (gap * (numColumns - 1));
  const itemWidth = availableWidth / numColumns;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["catalog", "products", activeCategory],
    queryFn: async () => {
      const params = activeCategory !== "All" ? `?category=${activeCategory}` : "";
      const res = await apiGet<Product[]>(`/catalog/products${params}`);
      return res.data;
    },
  });

  const { data: banners = [] } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await apiGet<Banner[]>("/banners");
      return res.data;
    },
  });

  const flatListRef = useRef<FlatList>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const bannerWidth = width; // We will use full width minus margins inside the item

  const products = data || [];
  const featured = products.slice(0, 6);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.bg2, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Image source={require('../../../assets/logo.png')} style={{ width: 24, height: 24 }} contentFit="contain" />
          <Text style={[styles.logoText, { color: colors.foreground }]}>Goldy Mobiles</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.push("/(tabs)/search")} hitSlop={8}>
            <Ionicons name="search-outline" size={22} color={colors.text2} />
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/notifications")} hitSlop={8} style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={22} color={colors.text2} />
            <View style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive }} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      >
        {banners.length > 0 ? (
          <View style={{ marginVertical: 16 }}>
            <FlatList
              ref={flatListRef}
              data={banners}
              keyExtractor={(item) => item._id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={banners.length > 1}
              getItemLayout={(_, index) => ({ length: bannerWidth, offset: bannerWidth * index, index })}
              renderItem={({ item }) => (
                <View style={{ width: bannerWidth, paddingHorizontal: 16 }}>
                  <View style={{ width: "100%", height: 160, borderRadius: 14, overflow: "hidden" }}>
                    <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </View>
                </View>
              )}
            />
          </View>
        ) : (
          <LinearGradient colors={["#2a1a00", "#1a1a1a"]} style={styles.banner}>
            <View>
              <Text style={[styles.bannerSub, { color: colors.primary }]}>Goldy Mobiles</Text>
              <Text style={[styles.bannerTitle, { color: colors.foreground }]}>{"Premium\nElectronics"}</Text>
              <Pressable
                style={[styles.bannerBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)/browse")}
              >
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: "#000" }}>Shop Now</Text>
              </Pressable>
            </View>
            <Ionicons name="phone-portrait" size={72} color={colors.primary} style={{ opacity: 0.3 }} />
          </LinearGradient>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCategory === cat ? colors.primary : colors.bg3,
                  borderColor: activeCategory === cat ? colors.primary : colors.border2,
                },
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: activeCategory === cat ? "#000" : colors.text2 },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured Products</Text>
          <Pressable onPress={() => router.push("/(tabs)/browse")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : featured.length === 0 ? (
          <EmptyState icon="phone-portrait-outline" title="No products found" />
        ) : (
          <View style={styles.grid}>
            {featured.map((p) => (
              <View key={p._id} style={{ width: itemWidth }}>
                <ProductCard
                  product={p}
                  isWishlisted={isWishlisted(p._id)}
                  onToggleWishlist={toggle}
                />
              </View>
            ))}
          </View>
        )}
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  banner: {
    margin: 16,
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  bannerSub: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, marginBottom: 4 },
  bannerTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold", lineHeight: 28 },
  bannerBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 12, fontFamily: "Inter_500Medium" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 8 },
});
