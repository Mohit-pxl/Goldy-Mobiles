import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StockBadge from "@/components/StockBadge";
import { useWishlist } from "@/context/WishlistContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Product } from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { toggle, isWishlisted } = useWishlist();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalog", "product", id],
    queryFn: async () => {
      const res = await apiGet<Product>(`/catalog/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const product = data;

  const handleWhatsApp = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const customerName = "John Doe"; // Mock customer name
    const customerPhone = "+91 9876543210"; // Mock customer phone
    
    const message = `Hello, I want to inquire about the product: ${product.name} (Brand: ${product.brand}).\n\nCustomer Details:\nName: ${customerName}\nPhone: ${customerPhone}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=917987522364&text=${encodedMessage}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        apiPost("/inquiries", { productId: product._id }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["my-inquiries"] });
      } else {
        Alert.alert("Error", "WhatsApp is not installed on your device.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not open WhatsApp.");
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.text3} />
        <Text style={[styles.errorText, { color: colors.text2 }]}>Product not found</Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const wishlisted = isWishlisted(product._id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
        <Pressable style={styles.iconBtn} onPress={() => { toggle(product); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
          <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={22} color={wishlisted ? colors.destructive : colors.text2} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={[styles.imgBox, { backgroundColor: colors.bg3 }]}>
          {product.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.productImg} contentFit="contain" />
          ) : (
            <Ionicons name="phone-portrait-outline" size={80} color={colors.text3} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
              <Text style={[styles.productBrand, { color: colors.text3 }]}>{product.brand} · {product.category}</Text>
            </View>
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>{fmt(product.sellingPrice)}</Text>
            {product.mrp && product.mrp > product.sellingPrice && (
              <>
                <Text style={[styles.mrp, { color: colors.text3 }]}>{fmt(product.mrp)}</Text>
                <View style={[styles.discountBadge, { backgroundColor: colors.greenBg }]}>
                  <Text style={[styles.discountText, { color: colors.greenText }]}>
                    {Math.round((1 - product.sellingPrice / product.mrp) * 100)}% off
                  </Text>
                </View>
              </>
            )}
          </View>

          {product.gstPercent > 0 && (
            <Text style={[styles.gstNote, { color: colors.text3 }]}>
              Incl. {product.gstPercent}% GST {product.hsnCode ? `· HSN ${product.hsnCode}` : ""}
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {product.specifications && product.specifications.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Specifications</Text>
              <View style={[styles.specBox, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
                {product.specifications.map((s, i) => (
                  <View key={i} style={[styles.specRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.specKey, { color: colors.text3 }]}>{s.key}</Text>
                    <Text style={[styles.specVal, { color: colors.foreground }]}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {product.description && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Description</Text>
              <Text style={[styles.description, { color: colors.text2 }]}>{product.description}</Text>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.stickyBottom, { backgroundColor: colors.bg2, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={[styles.waBtn, { backgroundColor: colors.whatsapp }]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={styles.waBtnText}>Enquire on WhatsApp</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  topTitle: { flex: 1, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  iconBtn: { padding: 4 },
  imgBox: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%" },
  body: { padding: 16, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  productName: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", lineHeight: 24 },
  productBrand: { fontSize: 12, marginTop: 3, fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  mrp: { fontSize: 15, textDecorationLine: "line-through", fontFamily: "Inter_400Regular" },
  discountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  discountText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  gstNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 },
  divider: { height: 1 },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium" },
  specBox: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  specKey: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  specVal: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1 },
  description: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  stickyBottom: { padding: 14, borderTopWidth: 1 },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
  },
  waBtnText: { color: "#fff", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});
