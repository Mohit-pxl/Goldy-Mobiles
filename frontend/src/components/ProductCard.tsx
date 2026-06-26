import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Product } from "@/services/api";

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onToggleWishlist?: (p: Product) => void;
}

export default function ProductCard({ product, isWishlisted, onToggleWishlist }: ProductCardProps) {
  const colors = useColors();
  const router = useRouter();

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.bg3, borderColor: colors.border }]}
      onPress={() => router.push(`/product/${product._id}`)}
    >
      <View style={[styles.imgBox, { backgroundColor: colors.bg4 }]}>
        {product.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.img} contentFit="contain" />
        ) : (
          <Ionicons name="phone-portrait-outline" size={36} color={colors.text3} />
        )}
      </View>
      {onToggleWishlist && (
        <Pressable style={styles.heart} onPress={() => onToggleWishlist(product)} hitSlop={8}>
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={22}
            color={isWishlisted ? colors.destructive : colors.text3}
          />
        </Pressable>
      )}
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={[styles.sub, { color: colors.text3 }]}>{product.brand}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.primary }]}>{fmt(product.sellingPrice)}</Text>
        {product.mrp && product.mrp > product.sellingPrice && (
          <Text style={[styles.mrp, { color: colors.text3 }]}>{fmt(product.mrp)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    position: "relative",
  },
  imgBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  name: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 15,
  },
  sub: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  price: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  mrp: { fontSize: 10, textDecorationLine: "line-through", fontFamily: "Inter_400Regular" },
});
