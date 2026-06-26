import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch, apiPost, StaffUser } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function StaffMgmtScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "staff" as "staff" | "admin" });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await apiGet<StaffUser[]>("/staff");
      return res.data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.email.trim()) throw new Error("Name and email are required.");
      await apiPost("/staff", { name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setShowModal(false);
      setForm({ name: "", email: "", role: "staff" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const updatePermMutation = useMutation({
    mutationFn: async ({ staffId, permissions }: { staffId: string; permissions: Record<string, boolean> }) => {
      await apiPatch(`/staff/${staffId}/permissions`, { permissions });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const staff = data || [];

  const togglePerm = (s: StaffUser, key: keyof StaffUser["permissions"], val: boolean) => {
    const updated = { ...s.permissions, [key]: val };
    updatePermMutation.mutate({ staffId: s._id, permissions: updated });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Staff</Text>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.addBtnText}>Invite</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : staff.length === 0 ? (
        <EmptyState icon="people-circle-outline" title="No staff yet" subtitle="Invite staff members to get started" />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(s) => s._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: s }) => (
            <View style={[styles.staffCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <View style={styles.staffHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{s.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.staffName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.staffEmail, { color: colors.text3 }]}>{s.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: s.role === "admin" ? colors.amberBg : colors.bg3 }]}>
                  <Text style={[styles.roleText, { color: s.role === "admin" ? colors.amberText : colors.text2 }]}>{s.role}</Text>
                </View>
              </View>
              <View style={[styles.permsSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.permsLabel, { color: colors.text3 }]}>Permissions</Text>
                {[
                  { key: "canViewCostPrice" as const, label: "View cost price" },
                  { key: "canEditPrice" as const, label: "Edit selling price" },
                  { key: "canViewReports" as const, label: "View reports" },
                  { key: "canManageStaff" as const, label: "Manage staff" },
                ].map(({ key, label }) => (
                  <View key={key} style={styles.permRow}>
                    <Text style={[styles.permLabel, { color: colors.text2 }]}>{label}</Text>
                    <Switch
                      value={s.permissions[key]}
                      onValueChange={(v) => togglePerm(s, key, v)}
                      trackColor={{ false: colors.bg4, true: colors.primary }}
                      thumbColor="#fff"
                      disabled={updatePermMutation.isPending}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Invite Staff</Text>
              <Pressable onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text2} />
              </Pressable>
            </View>
            <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Full name" placeholderTextColor={colors.text3} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
            <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Email address" placeholderTextColor={colors.text3} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
            <View style={styles.roleRow}>
              {(["staff", "admin"] as const).map((r) => (
                <Pressable key={r} style={[styles.roleBtn, { backgroundColor: form.role === r ? colors.primary : colors.bg3, borderColor: form.role === r ? colors.primary : colors.border2, flex: 1 }]} onPress={() => setForm((p) => ({ ...p, role: r }))}>
                  <Text style={{ color: form.role === r ? "#000" : colors.text2, fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 }}>{r.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: addMutation.isPending ? 0.7 : 1 }]} onPress={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitText}>Send invitation</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  staffCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  staffHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  staffName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  staffEmail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  permsSection: { borderTopWidth: 1, padding: 12, gap: 10 },
  permsLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium", marginBottom: 4 },
  permRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  permLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  formInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  submitText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});

