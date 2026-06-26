import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, apiDelete, User } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function UsersMgmtScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  // Filter States
  const [filterRole, setFilterRole] = useState<"all" | "customer" | "staff" | "admin">("all");
  const [filterDate, setFilterDate] = useState<"all" | "7days" | "30days" | "thisYear" | "custom">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const onChangeStart = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      setCustomStartDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  const onChangeEnd = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
      setCustomEndDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "customer" as "customer" | "staff" | "admin" });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiGet<User[]>("/users");
      return res.data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!payload.name.trim()) throw new Error("Name is required.");
      await apiPost("/users", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: typeof form }) => {
      if (!payload.name.trim()) throw new Error("Name is required.");
      await apiPatch(`/users/${id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const executeSave = () => {
    if (editingId) editMutation.mutate({ id: editingId, payload: form });
    else addMutation.mutate(form);
  };

  const handleSave = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to ${editingId ? "update" : "add"} this user?`)) {
        executeSave();
      }
    } else {
      Alert.alert(
        "Confirm Action",
        `Are you sure you want to ${editingId ? "update" : "add"} this user?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Confirm", onPress: executeSave }
        ]
      );
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        deleteMutation.mutate(id);
      }
    } else {
      Alert.alert(
        "Delete User",
        `Are you sure you want to delete ${name}? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
        ]
      );
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", email: "", phone: "", role: "customer" });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u._id);
    setForm({ name: u.name, email: u.email, phone: u.phone || "", role: u.role });
    setShowModal(true);
  };

  // Filter Logic
  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const now = new Date().getTime();
    
    return data.filter(u => {
      // Role Filter
      if (filterRole !== "all" && u.role !== filterRole) return false;
      
      // Date Filter
      if (filterDate !== "all") {
        const uDate = new Date((u as any).createdAt || new Date()).getTime();
        const diffDays = (now - uDate) / (1000 * 60 * 60 * 24);
        if (filterDate === "7days" && diffDays > 7) return false;
        if (filterDate === "30days" && diffDays > 30) return false;
        if (filterDate === "thisYear" && new Date(uDate).getFullYear() !== new Date().getFullYear()) return false;
        if (filterDate === "custom") {
          const start = new Date(customStartDate).getTime();
          const end = new Date(customEndDate).getTime();
          if (!isNaN(start) && uDate < start) return false;
          if (!isNaN(end) && uDate > end + 86400000) return false; // add 1 day to cover the full end date
        }
      }
      return true;
    });
  }, [data, filterRole, filterDate, customStartDate, customEndDate]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Users</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => setShowFilters(!showFilters)} hitSlop={8}>
            <Ionicons name="filter-outline" size={22} color={showFilters ? colors.primary : colors.text2} />
          </Pressable>
          <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.addBtnText}>Add User</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Section */}
      {showFilters && (
        <View style={[styles.filterContainer, { backgroundColor: colors.bg2, borderBottomColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.text3 }]}>Filter by Role</Text>
          <View style={styles.filterChips}>
            {(["all", "customer", "staff", "admin"] as const).map((r) => (
              <Pressable 
                key={r} 
                style={[styles.chip, { backgroundColor: filterRole === r ? colors.primary : colors.bg3, borderColor: filterRole === r ? colors.primary : colors.border2 }]}
                onPress={() => setFilterRole(r)}
              >
                <Text style={{ color: filterRole === r ? "#000" : colors.text2, fontSize: 11, fontFamily: filterRole === r ? "Inter_600SemiBold" : "Inter_400Regular" }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <Text style={[styles.filterLabel, { color: colors.text3, marginTop: 12 }]}>Filter by Join Date</Text>
          <View style={styles.filterChips}>
            {[
              { id: "all", label: "All time" },
              { id: "7days", label: "Last 7 days" },
              { id: "30days", label: "Last 30 days" },
              { id: "thisYear", label: "This Year" },
              { id: "custom", label: "Custom Range" },
            ].map((f) => (
              <Pressable 
                key={f.id} 
                style={[styles.chip, { backgroundColor: filterDate === f.id ? colors.primary : colors.bg3, borderColor: filterDate === f.id ? colors.primary : colors.border2 }]}
                onPress={() => setFilterDate(f.id as any)}
              >
                <Text style={{ color: filterDate === f.id ? "#000" : colors.text2, fontSize: 11, fontFamily: filterDate === f.id ? "Inter_600SemiBold" : "Inter_400Regular" }}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {filterDate === "custom" && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.filterLabel, { color: colors.text3, marginBottom: 4 }]}>From</Text>
                <Pressable
                  style={[styles.formInput, { backgroundColor: colors.bg3, borderColor: colors.border, justifyContent: 'center' }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={{ color: customStartDate ? colors.foreground : colors.text3 }}>
                    {customStartDate || "Select Date"}
                  </Text>
                </Pressable>
                {showStartPicker && (
                  <DateTimePicker
                    value={customStartDate ? new Date(customStartDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onChangeStart}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.filterLabel, { color: colors.text3, marginBottom: 4 }]}>To</Text>
                <Pressable
                  style={[styles.formInput, { backgroundColor: colors.bg3, borderColor: colors.border, justifyContent: 'center' }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={{ color: customEndDate ? colors.foreground : colors.text3 }}>
                    {customEndDate || "Select Date"}
                  </Text>
                </Pressable>
                {showEndPicker && (
                  <DateTimePicker
                    value={customEndDate ? new Date(customEndDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={onChangeEnd}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* User List */}
      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon="people-outline" title="No users found" subtitle="Try adjusting your filters or add a new user." />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(u) => u._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: u }) => (
            <View style={[styles.userCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <View style={styles.userHeader}>
                <View style={[styles.avatar, { backgroundColor: u.role === 'admin' ? colors.redBg : u.role === 'staff' ? colors.primary + "33" : colors.bg4 }]}>
                  <Text style={[styles.avatarText, { color: u.role === 'admin' ? colors.redText : u.role === 'staff' ? colors.primary : colors.text2 }]}>
                    {u.name[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{u.name}</Text>
                  <Text style={[styles.userMeta, { color: colors.text3 }]} numberOfLines={1}>
                    {u.email || "No email"} · {u.phone || "No phone"}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: u.role === "admin" ? colors.redBg : u.role === "staff" ? colors.amberBg : colors.blueBg }]}>
                  <Text style={[styles.roleText, { color: u.role === "admin" ? colors.redText : u.role === "staff" ? colors.amberText : colors.blueText }]}>
                    {u.role.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={[styles.userFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.joinDate, { color: colors.text3 }]}>
                  Joined: {new Date((u as any).createdAt || new Date()).toLocaleDateString('en-GB')}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable style={[styles.actionBtn, { backgroundColor: colors.bg3, borderColor: colors.border2 }]} onPress={() => openEdit(u)}>
                    <Ionicons name="pencil" size={14} color={colors.text2} />
                    <Text style={[styles.actionBtnText, { color: colors.text2 }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: colors.redBg, borderColor: colors.redText + "44" }]} onPress={() => handleDelete(u._id, u.name)}>
                    <Ionicons name="trash" size={14} color={colors.redText} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingId ? "Edit User" : "Add User"}</Text>
              <Pressable onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text2} />
              </Pressable>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text2 }]}>Full Name</Text>
              <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="e.g. Ramesh Kumar" placeholderTextColor={colors.text3} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text2 }]}>Email</Text>
              <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="e.g. ramesh@example.com" placeholderTextColor={colors.text3} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text2 }]}>Phone Number</Text>
              <TextInput style={[styles.formInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="e.g. +91 9876543210" placeholderTextColor={colors.text3} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text2 }]}>Role</Text>
              <View style={styles.roleRow}>
                {(["customer", "staff", "admin"] as const).map((r) => (
                  <Pressable key={r} style={[styles.roleBtn, { backgroundColor: form.role === r ? colors.primary : colors.bg3, borderColor: form.role === r ? colors.primary : colors.border2, flex: 1 }]} onPress={() => setForm((p) => ({ ...p, role: r }))}>
                    <Text style={{ color: form.role === r ? "#000" : colors.text2, fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 12 }}>{r.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable 
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (addMutation.isPending || editMutation.isPending) ? 0.7 : 1 }]} 
              onPress={handleSave} 
              disabled={addMutation.isPending || editMutation.isPending}
            >
              {(addMutation.isPending || editMutation.isPending) ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.submitText}>Save User</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  
  filterContainer: { padding: 16, borderBottomWidth: 1 },
  filterLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },

  userCard: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  userHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  userName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  
  userFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  joinDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  formGroup: { gap: 6 },
  formLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  formInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});
