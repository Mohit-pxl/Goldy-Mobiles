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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Enter your full name");
const phoneSchema = z.string().length(10, "Please enter a valid 10-digit phone number");
const emailSchema = z.string().email("Please enter a valid email address").endsWith("@gmail.com", "Email must end with @gmail.com");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters, include uppercase, lowercase & special character")
  .regex(/[A-Z]/, "Password must be at least 8 characters, include uppercase, lowercase & special character")
  .regex(/[a-z]/, "Password must be at least 8 characters, include uppercase, lowercase & special character")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must be at least 8 characters, include uppercase, lowercase & special character");

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getError = (schema: z.ZodType, value: string) => {
    const res = schema.safeParse(value);
    return res.success ? "" : res.error.issues[0].message;
  };

  // Validation logic
  const nameError = (submitted || form.name.length > 0) ? getError(nameSchema, form.name) : "";
  const phoneError = (submitted || form.phone.length > 0) ? getError(phoneSchema, form.phone) : "";
  const emailError = (submitted || form.email.length > 0) ? getError(emailSchema, form.email) : "";
  const passwordError = (submitted || form.password.length > 0) ? getError(passwordSchema, form.password) : "";
  const confirmPasswordError = (submitted || form.confirmPassword.length > 0) && form.password !== form.confirmPassword 
    ? "Passwords do not match" : "";

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)");
    }
  };

  const handleRegister = async () => {
    setSubmitted(true);
    
    if (nameError || phoneError || emailError || passwordError || confirmPasswordError || 
        !form.name || !form.phone || !form.email || !form.password || !form.confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // AuthGuard will handle navigation to root
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create account. Please try again.");
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
          <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            
            <Text style={[styles.label, { color: colors.text2 }]}>Full Name</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: nameError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="person-outline" size={18} color={nameError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="John Doe"
                placeholderTextColor={colors.text3}
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                value={form.name}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, name: v }));
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!nameError && <Text style={[styles.errorText, { color: "#EF4444" }]}>{nameError}</Text>}

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Mobile Number</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: phoneError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="call-outline" size={18} color={phoneError ? "#EF4444" : colors.text3} />
              <Text style={{ color: colors.text2, fontFamily: "Inter_500Medium", fontSize: 14 }}>+91</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="9876543210"
                placeholderTextColor={colors.text3}
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                keyboardType="phone-pad"
                maxLength={10}
                value={form.phone}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, phone: v.replace(/\D/g, "") }));
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!phoneError && <Text style={[styles.errorText, { color: "#EF4444" }]}>{phoneError}</Text>}

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Email Address</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: emailError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="mail-outline" size={18} color={emailError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text3}
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.email}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, email: v }));
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!emailError && <Text style={[styles.errorText, { color: "#EF4444" }]}>{emailError}</Text>}

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Password</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: passwordError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Create a password"
                placeholderTextColor={colors.text3}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, password: v }));
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!passwordError && <Text style={[styles.errorText, { color: "#EF4444" }]}>{passwordError}</Text>}

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Confirm Password</Text>
            <View style={[
              styles.inputRow, 
              { backgroundColor: colors.bg3, borderColor: confirmPasswordError ? "#EF4444" : colors.border2 }
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={confirmPasswordError ? "#EF4444" : colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Repeat password"
                placeholderTextColor={colors.text3}
                secureTextEntry
                value={form.confirmPassword}
                onChangeText={(v) => {
                  setForm(prev => ({ ...prev, confirmPassword: v }));
                  if (submitted) setSubmitted(false);
                }}
              />
            </View>
            {!!confirmPasswordError && <Text style={[styles.errorText, { color: "#EF4444" }]}>{confirmPasswordError}</Text>}

            <Pressable
              style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginTop: 16 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Create Account</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
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
    paddingBottom: 16,
  },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60, paddingTop: 12 },
  form: { width: "100%", gap: 10 },
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
    marginTop: -6,
    marginBottom: 2,
  }
});
