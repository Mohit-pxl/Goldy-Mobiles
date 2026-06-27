import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address").endsWith("@gmail.com", "Email must end with @gmail.com");
const passwordSchema = z.string().min(1, "Please enter your password");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getError = (schema: z.ZodType, value: string) => {
    const res = schema.safeParse(value);
    return res.success ? "" : res.error.issues[0].message;
  };

  const emailError = (submitted || email.length > 0) ? getError(emailSchema, email) : "";
  const passwordError = (submitted || password.length > 0) ? getError(passwordSchema, password) : "";

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)");
    }
  };

  const handleLogin = async () => {
    setSubmitted(true);
    if (getError(emailSchema, email) || getError(passwordSchema, password)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is handled automatically by AuthGuard in _layout
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text2 }]}>Email Address</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: emailError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="mail-outline" size={18} color={emailError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!emailError && (
              <Text style={[styles.errorText, { color: "#EF4444" }]}>{emailError}</Text>
            )}

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Password</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: passwordError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.text3}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (submitted) setSubmitted(false);
                }}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
            </View>
            {!!passwordError && (
              <Text style={[styles.errorText, { color: "#EF4444" }]}>{passwordError}</Text>
            )}

            <Pressable
              style={{ alignSelf: "flex-end", paddingVertical: 8 }}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={{ fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Forgot Password?
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginTop: 8 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Login</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  center: { flex: 1, paddingHorizontal: 24, justifyContent: "center", paddingBottom: 60 },
  form: { width: "100%", gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  btnPrimary: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
    marginBottom: 4,
  }
});
