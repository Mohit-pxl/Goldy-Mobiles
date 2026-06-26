import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = "cube-outline", title, subtitle }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.text3} />
      <Text style={[styles.title, { color: colors.text2 }]}>{title}</Text>
      {subtitle && <Text style={[styles.sub, { color: colors.text3 }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  sub: { fontSize: 13, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
});
