import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch } from "@/services/api";

type InvoiceSettings = {
  shopName: string;
  address: {
    street: string;
    city: string;
    state: string;
    pin: string;
  };
  phone: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  termsAndConditions: string;
};

export default function InvoiceSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<InvoiceSettings>({
    shopName: "",
    address: { street: "", city: "", state: "", pin: "" },
    phone: "",
    email: "",
    gstNumber: "",
    panNumber: "",
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "" },
    termsAndConditions: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiGet<InvoiceSettings>("/settings");
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        shopName: data.shopName || "",
        address: {
          street: data.address?.street || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          pin: data.address?.pin || "",
        },
        phone: data.phone || "",
        email: data.email || "",
        gstNumber: data.gstNumber || "",
        panNumber: data.panNumber || "",
        bankDetails: {
          bankName: data.bankDetails?.bankName || "",
          accountNumber: data.bankDetails?.accountNumber || "",
          ifscCode: data.bankDetails?.ifscCode || "",
        },
        termsAndConditions: data.termsAndConditions || "",
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: Partial<InvoiceSettings>) => {
      return await apiPatch<InvoiceSettings>("/settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert("Success", "Invoice settings updated successfully.");
      router.back();
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to update settings.");
    },
  });

  const handleSave = () => {
    mutation.mutate(form);
  };

  const updateAddress = (key: keyof InvoiceSettings["address"], value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
  };

  const updateBank = (key: keyof InvoiceSettings["bankDetails"], value: string) => {
    setForm((prev) => ({ ...prev, bankDetails: { ...prev.bankDetails, [key]: value } }));
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Invoice Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Store Info</Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text2 }]}>Shop Name</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
            value={form.shopName}
            onChangeText={(val) => setForm({ ...form, shopName: val })}
            placeholder="Shop Name"
            placeholderTextColor={colors.text3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text2 }]}>Phone</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
            value={form.phone}
            onChangeText={(val) => setForm({ ...form, phone: val })}
            placeholder="Phone Number"
            placeholderTextColor={colors.text3}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>GST Number</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.gstNumber}
              onChangeText={(val) => setForm({ ...form, gstNumber: val })}
              placeholder="GST Number"
              placeholderTextColor={colors.text3}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>PAN Number</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.panNumber}
              onChangeText={(val) => setForm({ ...form, panNumber: val })}
              placeholder="PAN Number"
              placeholderTextColor={colors.text3}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 12 }]}>Address Details</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text2 }]}>Street</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
            value={form.address.street}
            onChangeText={(val) => updateAddress("street", val)}
            placeholder="Street Address"
            placeholderTextColor={colors.text3}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>City</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.address.city}
              onChangeText={(val) => updateAddress("city", val)}
              placeholder="City"
              placeholderTextColor={colors.text3}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>State</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.address.state}
              onChangeText={(val) => updateAddress("state", val)}
              placeholder="State"
              placeholderTextColor={colors.text3}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>PIN Code</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.address.pin}
              onChangeText={(val) => updateAddress("pin", val)}
              placeholder="PIN Code"
              placeholderTextColor={colors.text3}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 12 }]}>Bank Details (Printed on Invoice)</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text2 }]}>Bank Name</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
            value={form.bankDetails.bankName}
            onChangeText={(val) => updateBank("bankName", val)}
            placeholder="E.g. State Bank of India"
            placeholderTextColor={colors.text3}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>Account Number</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.bankDetails.accountNumber}
              onChangeText={(val) => updateBank("accountNumber", val)}
              placeholder="Account Number"
              placeholderTextColor={colors.text3}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text2 }]}>IFSC Code</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border }]}
              value={form.bankDetails.ifscCode}
              onChangeText={(val) => updateBank("ifscCode", val)}
              placeholder="IFSC Code"
              placeholderTextColor={colors.text3}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 12 }]}>Terms & Conditions</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.bg2, borderColor: colors.border, height: 100, textAlignVertical: "top" }]}
            value={form.termsAndConditions}
            onChangeText={(val) => setForm({ ...form, termsAndConditions: val })}
            placeholder="1. Goods once sold will not be taken back..."
            placeholderTextColor={colors.text3}
            multiline
          />
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: mutation.isPending ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 12 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 16 },
});
