import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface StockBadgeProps {
  stock: number;
  threshold?: number;
  compact?: boolean;
}

export default function StockBadge({ stock, threshold = 5, compact = false }: StockBadgeProps) {
  const colors = useColors();

  let bg: string;
  let textColor: string;
  let label: string;

  if (stock === 0) {
    bg = colors.redBg;
    textColor = colors.redText;
    label = compact ? "0" : "Out of stock";
  } else if (stock <= threshold) {
    bg = colors.amberBg;
    textColor = colors.amberText;
    label = compact ? `${stock} ⚠` : `${stock} pcs ⚠`;
  } else {
    bg = colors.greenBg;
    textColor = colors.greenText;
    label = compact ? `${stock}` : `${stock} pcs`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
