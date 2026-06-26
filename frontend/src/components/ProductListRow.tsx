import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import StockBadge from "@/components/StockBadge";
import { useColors } from "@/hooks/useColors";
import { Product } from "@/services/api";

interface ProductListRowProps {
  product: Product;
  onPress?: () => void;
  showCostPrice?: boolean;
}

export default function ProductListRow({ product, onPress, showCostPrice }: ProductListRowProps) {
  const colors = useColors();
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.thumb, { backgroundColor: colors.bg4 }]}>
        {product.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.thumbImg} contentFit="contain" />
        ) : (
          <Ionicons name="phone-portrait-outline" size={20} color={colors.text3} />
        )}
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.sub, { color: colors.text3 }]}>
          {product.brand} · {product.internalCode || product.barcode || "–"} · {fmt(product.sellingPrice)}
          {showCostPrice && product.costPrice ? ` (Cost: ${fmt(product.costPrice)})` : ""}
        </Text>
      </View>
      <StockBadge stock={product.stock} threshold={product.lowStockThreshold} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  main: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sub: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
});
