import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiDelete, Product } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function RemoveProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["staff-products", "remove-stock-zero"],
    queryFn: async () => {
      // Use the new outOfStock filter and fetch a high limit so we see all of them
      const res = await apiGet<Product[]>("/products?outOfStock=true&limit=1000");
      return res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/products/${id}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["staff-products"] });
      // Invalidate global products cache if needed
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to remove product");
    },
  });

  const confirmDelete = (product: Product) => {
    Alert.alert(
      "Warning",
      `Are you sure you want to completely remove "${product.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => deleteMutation.mutate(product._id) 
        }
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Remove Products</Text>
        <View style={{ width: 22 }} />
      </View>
      
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text style={{ color: colors.text2, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 }}>
          Showing products with 0 stock
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : data?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState icon="cube-outline" title="No zero stock products" subtitle="All your products currently have stock." />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.productRow, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.productSub, { color: colors.text3 }]}>{item.brand} • SKU: {item.sku || "N/A"}</Text>
              </View>
              <Pressable
                style={[styles.deleteBtn, { backgroundColor: colors.redBg }]}
                onPress={() => confirmDelete(item)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.redText} />
                <Text style={[styles.deleteBtnText, { color: colors.redText }]}>Remove</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  productSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" }
});
