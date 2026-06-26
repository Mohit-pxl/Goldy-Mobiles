import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
import { apiPost } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp } = useAuth();

  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const otpInputRef = useRef<TextInput>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)");
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(email.trim().toLowerCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("OTP");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    // Don't verify with backend yet, because verifyOTP logs the user in and consumes the OTP.
    // We will verify it when updating the password.
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("NEW_PASSWORD");
      setLoading(false);
    }, 500);
  };

  const handleUpdatePassword = async () => {
    if (!password || password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match or are empty.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password/reset", {
        email: email.trim().toLowerCase(),
        otp,
        password
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("SUCCESS");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update password.");
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
          <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {step === "EMAIL" && (
            <View style={styles.form}>
              <Text style={[styles.instruction, { color: colors.text2 }]}>
                Enter your email address to receive an OTP for password reset.
              </Text>
              <Text style={[styles.label, { color: colors.text2 }]}>Email Address</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
                <Ionicons name="mail-outline" size={18} color={colors.text3} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <Pressable
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginTop: 16 }]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Send Email OTP</Text>}
              </Pressable>
            </View>
          )}

          {step === "OTP" && (
            <View style={styles.form}>
              <Text style={[styles.instruction, { color: colors.text2 }]}>
                Enter the 6-digit OTP sent to {email}.
              </Text>
              
              <Pressable onPress={() => otpInputRef.current?.focus()} style={styles.otpContainer}>
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenInput}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      { backgroundColor: colors.bg3, borderColor: i < otp.length ? colors.primary : colors.border2 },
                    ]}
                  >
                    <Text style={[styles.otpChar, { color: colors.foreground }]}>{otp[i] || ""}</Text>
                  </View>
                ))}
              </Pressable>

              <Pressable
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginTop: 16 }]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Verify OTP</Text>}
              </Pressable>
              
              <Pressable onPress={handleSendOtp} disabled={loading} style={{ alignItems: "center", marginTop: 16 }}>
                <Text style={[styles.resend, { color: colors.text2 }]}>Resend OTP</Text>
              </Pressable>
            </View>
          )}

          {step === "NEW_PASSWORD" && (
            <View style={styles.form}>
              <Text style={[styles.instruction, { color: colors.text2 }]}>
                Create a strong new password for your account.
              </Text>

              <Text style={[styles.label, { color: colors.text2 }]}>New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.text3} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.text3}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <Text style={[styles.label, { color: colors.text2, marginTop: 8 }]}>Confirm Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.text3} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.text3}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <Pressable
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1, marginTop: 16 }]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Update Password</Text>}
              </Pressable>
            </View>
          )}

          {step === "SUCCESS" && (
            <View style={[styles.form, { alignItems: "center", marginTop: 40 }]}>
              <View style={[styles.successCircle, { backgroundColor: colors.greenBg }]}>
                <Ionicons name="checkmark" size={40} color={colors.greenText} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Password Updated!</Text>
              <Text style={[styles.instruction, { color: colors.text2, textAlign: "center", marginBottom: 24 }]}>
                Your password has been changed successfully. You can now use your new password to log in.
              </Text>
              <Pressable
                style={[styles.btnPrimary, { backgroundColor: colors.primary, width: "100%" }]}
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Back to Login</Text>
              </Pressable>
            </View>
          )}

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
  instruction: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 16, lineHeight: 20 },
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
  otpContainer: { flexDirection: "row", gap: 8, marginVertical: 8, justifyContent: "center" },
  hiddenInput: { position: "absolute", opacity: 0, width: 0 },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  otpChar: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resend: { fontSize: 13, fontFamily: "Inter_500Medium", textDecorationLine: "underline" },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 8 },
});
