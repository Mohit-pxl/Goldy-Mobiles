import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        { width: width as number, height, borderRadius, backgroundColor: colors.bg4, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} borderRadius={8} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={12} />
        <Skeleton width="50%" height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {},
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "center" },
  lines: { flex: 1, gap: 6 },
});
