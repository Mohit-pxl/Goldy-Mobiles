import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, sendOtp, devLogin } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)");
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return; // Require 6 digits
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is handled automatically by AuthGuard in _layout
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid OTP", "Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendOtp(email);
      Alert.alert("Sent!", "A new OTP has been sent to your email.");
    } catch {
      Alert.alert("Error", "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
      <Pressable onPress={handleBack} style={styles.back} hitSlop={12}>
        <Text style={[styles.backText, { color: colors.text2 }]}>← Back</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.foreground }]}>Verify OTP</Text>
        <Text style={[styles.sub, { color: colors.text3 }]}>
          We sent a code to{"\n"}
          <Text style={{ color: colors.primary }}>{email}</Text>
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpContainer}>
          <TextInput
            ref={inputRef}
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
                {
                  backgroundColor: colors.bg3,
                  borderColor: i < otp.length ? colors.primary : colors.border2,
                },
              ]}
            >
              <Text style={[styles.otpChar, { color: colors.foreground }]}>{otp[i] || ""}</Text>
            </View>
          ))}
        </Pressable>

        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleVerify}
          disabled={loading || otp.length < 6}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Verify & Sign in</Text>
          )}
        </Pressable>

        <Pressable onPress={handleResend} disabled={resending}>
          <Text style={[styles.resend, { color: colors.text2 }]}>
            {resending ? "Resending..." : "Didn't receive it? Resend OTP"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 32 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  center: { alignItems: "center", gap: 16 },
  title: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22, fontFamily: "Inter_400Regular" },
  otpContainer: { flexDirection: "row", gap: 10, marginVertical: 8 },
  hiddenInput: { position: "absolute", opacity: 0, width: 0 },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  otpChar: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  btn: {
    width: "100%",
    borderRadius: 10,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resend: { fontSize: 12, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
});

