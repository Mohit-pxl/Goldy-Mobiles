import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, Customer } from "@/services/api";

interface Props {
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}

export default function CustomerPicker({ selected, onSelect }: Props) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const open_ = () => {
    Keyboard.dismiss();
    setOpen(true);
  };

  const clear = () => {
    onSelect(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <>
      {selected ? (
        <View style={[styles.selectedRow, { backgroundColor: colors.bg3, borderColor: colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{selected.name[0].toUpperCase()}</Text>
          </View>
          <View style={styles.selInfo}>
            <Text style={[styles.selName, { color: colors.foreground }]}>{selected.name}</Text>
            <Text style={[styles.selPhone, { color: colors.text3 }]}>{selected.phone}</Text>
          </View>
          <Pressable onPress={open_} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color={colors.text2} />
          </Pressable>
          <Pressable onPress={clear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.text3} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.triggerRow, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}
          onPress={open_}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.text3} />
          <Text style={[styles.triggerText, { color: colors.text3 }]}>Add customer (optional)</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text3} />
        </Pressable>
      )}

      <CustomerPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        onSelect={(c) => { onSelect(c); setOpen(false); }}
        current={selected}
      />
    </>
  );
}

function CustomerPickerModal({
  visible,
  onClose,
  onSelect,
  current,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: Customer) => void;
  current: Customer | null;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setResults([]);
      setShowNewForm(false);
      setNewName("");
      setNewPhone("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiGet<Customer[]>(`/customers?search=${encodeURIComponent(q)}&limit=8`);
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (t: string) => {
    setQuery(t);
    setShowNewForm(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(t), 300);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert("Required", "Enter name and phone number.");
      return;
    }
    if (!/^\d{10}$/.test(newPhone.replace(/\s/g, ""))) {
      Alert.alert("Invalid", "Enter a valid 10-digit phone number.");
      return;
    }
    setCreating(true);
    try {
      const res = await apiPost<Customer>("/customers", {
        name: newName.trim(),
        phone: newPhone.trim().replace(/\s/g, ""),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(res.data);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not create customer.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.bg2,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select customer</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text2} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.bg3, borderColor: query ? colors.primary : colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.text3} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or phone"
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={handleChange}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => { setQuery(""); setResults([]); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text3} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 320 }}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {/* Results */}
          {results.map((c) => (
            <Pressable
              key={c._id}
              style={[
                styles.resultRow,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: current?._id === c._id ? colors.bg4 : "transparent",
                },
              ]}
              onPress={() => { onSelect(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={[styles.rowAvatar, { backgroundColor: colors.bg4 }]}>
                <Text style={[styles.rowAvatarText, { color: colors.primary }]}>{c.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[styles.rowPhone, { color: colors.text3 }]}>{c.phone}</Text>
              </View>
              {(c.totalDue || 0) > 0 && (
                <View style={[styles.duePill, { backgroundColor: colors.redBg }]}>
                  <Text style={[styles.dueText, { color: colors.redText }]}>
                    Due ₹{(c.totalDue!).toLocaleString("en-IN")}
                  </Text>
                </View>
              )}
              {current?._id === c._id && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
            </Pressable>
          ))}

          {/* No results nudge */}
          {query.length > 0 && !searching && results.length === 0 && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.text3 }]}>
                No customer found for "{query}"
              </Text>
            </View>
          )}

          {/* New customer toggle */}
          {!showNewForm ? (
            <Pressable
              style={[styles.newBtn, { borderColor: colors.border2 }]}
              onPress={() => setShowNewForm(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.newBtnText, { color: colors.primary }]}>
                {query.length > 0 ? `Create "${query}" as new customer` : "Create new customer"}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.newForm, { backgroundColor: colors.bg3, borderColor: colors.border }]}>
              <Text style={[styles.newFormTitle, { color: colors.text3 }]}>NEW CUSTOMER</Text>

              <View style={[styles.newField, { borderColor: colors.border, backgroundColor: colors.bg4 }]}>
                <Ionicons name="person-outline" size={14} color={colors.text3} />
                <TextInput
                  style={[styles.newInput, { color: colors.foreground }]}
                  placeholder="Full name"
                  placeholderTextColor={colors.text3}
                  value={newName || (query.length > 2 ? query : "")}
                  onChangeText={setNewName}
                  autoFocus
                />
              </View>

              <View style={[styles.newField, { borderColor: colors.border, backgroundColor: colors.bg4 }]}>
                <Ionicons name="call-outline" size={14} color={colors.text3} />
                <TextInput
                  style={[styles.newInput, { color: colors.foreground }]}
                  placeholder="Phone number (10 digits)"
                  placeholderTextColor={colors.text3}
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  maxLength={10}
                />
              </View>

              <View style={styles.newFormActions}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: colors.border2 }]}
                  onPress={() => setShowNewForm(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text2 }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.createBtn, { backgroundColor: colors.primary, opacity: creating ? 0.7 : 1 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>Save & Select</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* Trigger */
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderStyle: "dashed",
  },
  triggerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  /* Selected */
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  selInfo: { flex: 1 },
  selName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  selPhone: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 4,
    gap: 12,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  /* Results */
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowPhone: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  duePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dueText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  /* No results */
  noResults: { paddingVertical: 16, alignItems: "center" },
  noResultsText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  /* New customer */
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderStyle: "dashed",
  },
  newBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  newForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  newFormTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  newField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  newInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  newFormActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  createBtn: {
    flex: 2,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
});
