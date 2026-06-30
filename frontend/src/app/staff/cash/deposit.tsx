import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCashSummary, useDepositToBank } from "@/services/queries/useCash";

export default function DepositScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: summary, isLoading } = useCashSummary();
  const depositMutation = useDepositToBank();

  const [amount, setAmount] = useState("");
  const [bankAccountLabel, setBankAccountLabel] = useState("");
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");

  const cashInHand = summary?.cashInHand ?? 0;
  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = () => {
    setAmountError("");

    if (!amount.trim()) {
      setAmountError("Amount is required");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError("Enter a valid positive amount");
      return;
    }
    if (parsedAmount > cashInHand) {
      setAmountError(`Cannot exceed available cash (₹${cashInHand.toLocaleString("en-IN")})`);
      return;
    }

    depositMutation.mutate(
      { amount: parsedAmount, note: note.trim() || undefined, bankAccountLabel: bankAccountLabel.trim() || undefined },
      {
        onSuccess: () => {
          Alert.alert("Success", "Deposit recorded successfully", [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (err: any) => {
          const msg = err?.message || "Failed to deposit. Please try again.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Deposit to bank</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 30 }}>
        {/* Available Cash Card */}
        <View style={[styles.cashCard, { backgroundColor: colors.greenBg }]}>
          <Ionicons name="cash-outline" size={24} color={colors.green} />
          <View>
            <Text style={[styles.cashCardLabel, { color: colors.greenText }]}>Available Cash in Hand</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.green} />
            ) : (
              <Text style={[styles.cashCardValue, { color: colors.green }]}>
                ₹{cashInHand.toLocaleString("en-IN")}
              </Text>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Amount to deposit *</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: amountError ? colors.destructive : colors.border,
                backgroundColor: colors.bg2,
              },
            ]}
            placeholder="e.g. 5000"
            placeholderTextColor={colors.text3}
            keyboardType="numeric"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              if (amountError) setAmountError("");
            }}
          />
          {amountError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{amountError}</Text>
          ) : null}
        </View>

        {/* Bank Label */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Bank account label</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.bg2 }]}
            placeholder="e.g. HDFC Bank •••• 4521"
            placeholderTextColor={colors.text3}
            value={bankAccountLabel}
            onChangeText={setBankAccountLabel}
          />
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Note (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.bg2 }]}
            placeholder="Any additional notes"
            placeholderTextColor={colors.text3}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Info Banner — updates live as amount changes */}
        {isValidAmount && parsedAmount <= cashInHand && (
          <View style={[styles.infoBanner, { backgroundColor: colors.amberBg, borderColor: colors.amber }]}>
            <Ionicons name="information-circle" size={20} color={colors.amber} />
            <Text style={[styles.bannerText, { color: colors.amberText }]}>
              Cash in hand will reduce by ₹{parsedAmount.toLocaleString("en-IN")} and bank balance will
              increase by the same amount.
            </Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: depositMutation.isPending ? 0.65 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={depositMutation.isPending}
        >
          {depositMutation.isPending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Confirm deposit</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  cashCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
  },
  cashCardLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  cashCardValue: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold" },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  submitBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
