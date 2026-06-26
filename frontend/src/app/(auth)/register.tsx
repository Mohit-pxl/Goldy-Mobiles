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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)");
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.email || !form.password || !form.confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert("Password mismatch", "Your passwords do not match.");
      return;
    }
    if (!form.email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
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
            <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
              <Ionicons name="person-outline" size={18} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="John Doe"
                placeholderTextColor={colors.text3}
                value={form.name}
                onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
              />
            </View>

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Mobile Number</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
              <Ionicons name="call-outline" size={18} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.text3}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => setForm(prev => ({ ...prev, phone: v }))}
              />
            </View>

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
              <Ionicons name="mail-outline" size={18} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text3}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.email}
                onChangeText={(v) => setForm(prev => ({ ...prev, email: v }))}
              />
            </View>

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Create a password"
                placeholderTextColor={colors.text3}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => setForm(prev => ({ ...prev, password: v }))}
              />
            </View>

            <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Confirm Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text3} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Repeat password"
                placeholderTextColor={colors.text3}
                secureTextEntry
                value={form.confirmPassword}
                onChangeText={(v) => setForm(prev => ({ ...prev, confirmPassword: v }))}
              />
            </View>

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
});
