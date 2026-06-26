import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiDelete, Banner } from "@/services/api";

export default function BannersManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [imageUrl, setImageUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await apiGet<Banner[]>("/banners");
      return res.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiPost("/banners", { imageUrl: url });
    },
    onSuccess: () => {
      setImageUrl("");
      qc.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: () => {
      Alert.alert("Error", "Failed to add banner");
    },
    onSettled: () => setAdding(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/banners/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete banner");
    },
  });

  const handleAdd = () => {
    if (!imageUrl.trim()) {
      Alert.alert("Error", "Please enter a valid Image URL");
      return;
    }
    setAdding(true);
    addMutation.mutate(imageUrl.trim());
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to remove this banner?")) {
        deleteMutation.mutate(id);
      }
    } else {
      Alert.alert("Delete Banner", "Are you sure you want to remove this banner?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        // Create a data URI so it works across platforms and persists
        setImageUrl(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setImageUrl(asset.uri);
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Manage Banners</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.addSection, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text2 }]}>Add New Banner</Text>
          <View style={styles.inputRow}>
            {imageUrl.startsWith("data:image") ? (
              <View style={[styles.input, { backgroundColor: colors.bg3, borderColor: colors.border2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }} numberOfLines={1}>
                  ✓ Local Image Attached
                </Text>
                <Pressable onPress={() => setImageUrl("")} hitSlop={12}>
                  <Ionicons name="close-circle" size={20} color={colors.text3} />
                </Pressable>
              </View>
            ) : (
              <View style={[styles.input, { backgroundColor: colors.bg3, borderColor: colors.border2, flexDirection: "row", alignItems: "center", paddingHorizontal: 0 }]}>
                <TextInput
                  style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, paddingHorizontal: 12, height: "100%" }}
                  placeholder="Paste Image URL or pick local..."
                  placeholderTextColor={colors.text3}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                />
                {imageUrl.length > 0 && (
                  <Pressable onPress={() => setImageUrl("")} hitSlop={12} style={{ paddingHorizontal: 12 }}>
                    <Ionicons name="close-circle" size={20} color={colors.text3} />
                  </Pressable>
                )}
              </View>
            )}
            <Pressable 
              style={[styles.pickBtn, { backgroundColor: colors.bg3, borderColor: colors.border2 }]}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable 
              style={[styles.addBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
              onPress={handleAdd}
              disabled={adding}
            >
              {adding ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.addBtnText}>Add</Text>}
            </Pressable>
          </View>
          <Text style={[styles.helper, { color: colors.text3 }]}>Banners are displayed on the Customer Home Page. Provide a valid HTTP(S) URL or pick from local storage.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={banners}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40, gap: 16 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="images-outline" size={48} color={colors.text3} />
                <Text style={[styles.emptyText, { color: colors.text2 }]}>No banners added yet.</Text>
                <Text style={[styles.emptySub, { color: colors.text3 }]}>The default banner will be shown to customers.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.bannerCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
                <Image source={{ uri: item.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
                <View style={styles.bannerRow}>
                  <Text style={[styles.bannerUrl, { color: colors.text2 }]} numberOfLines={1}>{item.imageUrl}</Text>
                  <Pressable onPress={() => handleDelete(item._id)} style={[styles.delBtn, { backgroundColor: colors.destructive + '22' }]}>
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { flex: 1, padding: 16, gap: 20 },
  addSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  pickBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
  addBtnText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  helper: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", marginTop: 40, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bannerCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  bannerImg: { width: "100%", height: 160, backgroundColor: "#000" },
  bannerRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  bannerUrl: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  delBtn: { padding: 8, borderRadius: 8 },
});
