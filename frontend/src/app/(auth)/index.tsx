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
  const { enterGuestMode, devLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [devLoading, setDevLoading] = useState<string | null>(null);

  const handleGuest = () => {
    enterGuestMode();
    router.replace("/(tabs)");
  };

  const handleDev = async (role: "admin" | "staff" | "customer") => {
    setDevLoading(role);
    try {
      await devLogin(role);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setDevLoading(null);
    }
  };

  const DEV_ROLES: { role: "admin" | "staff" | "customer"; label: string; icon: string; color: string }[] = [
    { role: "admin",    label: "Admin",    icon: "🛡️", color: colors.redText },
    { role: "staff",    label: "Staff",    icon: "🧑‍💼", color: colors.primary },
    { role: "customer", label: "Customer", icon: "🛍️", color: colors.blueText },
  ];

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
        </View>

        {/* ── Dev bypass ── */}
        <View style={[styles.devBox, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
          <View style={styles.devHeader}>
            <Ionicons name="code-working-outline" size={13} color={colors.text3} />
            <Text style={[styles.devTitle, { color: colors.text3 }]}>DEV LOGIN — no backend needed</Text>
          </View>
          <View style={styles.devRow}>
            {DEV_ROLES.map(({ role, label, icon, color }) => (
              <Pressable
                key={role}
                style={[styles.devBtn, { borderColor: color + "44", backgroundColor: color + "11" }]}
                onPress={() => handleDev(role)}
                disabled={devLoading !== null}
              >
                {devLoading === role ? (
                  <ActivityIndicator size="small" color={color} />
                ) : (
                  <>
                    <Text style={styles.devBtnIcon}>{icon}</Text>
                    <Text style={[styles.devBtnLabel, { color }]}>{label}</Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable style={styles.guestBtn} onPress={handleGuest}>
        <Text style={[styles.guestText, { color: colors.text2 }]}>Browse catalog without signing in →</Text>
      </Pressable>

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
  devBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 20,
    borderStyle: "dashed",
  },
  devHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  devTitle: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.4 },
  devRow: { flexDirection: "row", gap: 8 },
  devBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    minHeight: 52,
    justifyContent: "center",
  },
  devBtnIcon: { fontSize: 18 },
  devBtnLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  guestBtn: { alignItems: "center", paddingBottom: 8 },
  guestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
