import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { useWishlist } from "@/context/WishlistContext";
import { useColors } from "@/hooks/useColors";
import { useQueryClient } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, removeItem } = useWishlist();

  const handleEnquireAll = async () => {
    if (items.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const customerName = "John Doe"; // Mock customer name
    const customerPhone = "+91 9876543210"; // Mock customer phone
    
    const productList = items.map(p => `- ${p.name} (Brand: ${p.brand})`).join('\n');
    const message = `Hello, I want to inquire about the following products:\n${productList}\n\nCustomer Details:\nName: ${customerName}\nPhone: ${customerPhone}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=917987522364&text=${encodedMessage}`;
    
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        Promise.all(items.map(p => apiPost("/inquiries", { productId: p._id }))).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["my-inquiries"] });
        items.forEach(p => removeItem(p._id));
      } else {
        Alert.alert("Error", "WhatsApp is not installed on your device.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not open WhatsApp.");
    }
  };

  const handleRemove = (id: string, name: string) => {
    removeItem(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Wishlist</Text>
        <Text style={[styles.count, { color: colors.text3 }]}>{items.length} items</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Your wishlist is empty"
          subtitle="Heart products you like to save them here"
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(p) => p._id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => router.push(`/product/${item._id}`)}
              >
                <View style={[styles.thumb, { backgroundColor: colors.bg4 }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.text3} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.sub, { color: colors.text3 }]}>
                    {item.brand} · {fmt(item.sellingPrice)}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(item._id, item.name)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.text3} />
                </Pressable>
              </Pressable>
            )}
          />
          <View style={[styles.bottomBar, { backgroundColor: colors.bg2, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              style={[styles.waBtn, { backgroundColor: colors.whatsapp }]}
              onPress={handleEnquireAll}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.waBtnText}>Enquire all {items.length} on WhatsApp</Text>
            </Pressable>
          </View>
        </>
      )}
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
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  count: { fontSize: 13, fontFamily: "Inter_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  bottomBar: { padding: 14, borderTopWidth: 1 },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
  },
  waBtnText: { color: "#fff", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
});
