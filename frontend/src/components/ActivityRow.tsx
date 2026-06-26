import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface ActivityRowProps {
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  iconBg?: string;
}

export default function ActivityRow({ icon, title, subtitle, time, iconBg }: ActivityRowProps) {
  const colors = useColors();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg || colors.bg4 }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.sub, { color: colors.text3 }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.time, { color: colors.text3 }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 14 },
  main: { flex: 1 },
  title: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 10, marginTop: 1, fontFamily: "Inter_400Regular" },
  time: { fontSize: 10, flexShrink: 0, fontFamily: "Inter_400Regular" },
});
