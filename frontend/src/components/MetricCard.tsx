import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface MetricCardProps {
  value: string;
  label: string;
  valueColor?: "default" | "accent" | "green" | "red";
}

export default function MetricCard({ value, label, valueColor = "default" }: MetricCardProps) {
  const colors = useColors();

  const valColor =
    valueColor === "accent"
      ? colors.primary
      : valueColor === "green"
        ? colors.green
        : valueColor === "red"
          ? colors.destructive
          : colors.foreground;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg3 }]}>
      <Text style={[styles.value, { color: valColor }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
    flex: 1,
    minWidth: "45%",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    fontFamily: "Inter_400Regular",
  },
});
