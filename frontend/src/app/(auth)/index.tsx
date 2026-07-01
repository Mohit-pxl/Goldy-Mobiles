import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { enterGuestMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const handleGuest = () => {
    enterGuestMode();
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View />
        <Pressable onPress={toggleTheme} hitSlop={12} style={styles.themeToggle}>
          <Ionicons name={theme === "light" ? "moon" : "sunny"} size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Image source={require("../../../assets/logo.png")} style={styles.logoBox} contentFit="contain" />

        <Text style={[styles.appName, { color: colors.foreground }]}>Goldy Mobiles</Text>
        <Text style={[styles.tagline, { color: colors.text3 }]}>Premium store</Text>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Login</Text>
          </Pressable>

          <Pressable
            style={[styles.btnSecondary, { borderColor: colors.border2, backgroundColor: colors.bg2 }]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={[styles.btnTextSecondary, { color: colors.foreground }]}>Create Account</Text>
          </Pressable>

          <Pressable 
            style={[styles.btnGuest, { backgroundColor: colors.bg3, borderColor: colors.border2 }]} 
            onPress={handleGuest}
          >
            <Text style={[styles.guestText, { color: colors.foreground }]}>Browse Catalog</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.text2} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </View>

      <View style={{ height: insets.bottom + 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  themeToggle: {
    padding: 8,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 32 },
  buttonContainer: { width: "100%", gap: 12 },
  btnPrimary: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  btnTextSecondary: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  btnGuest: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  guestText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
