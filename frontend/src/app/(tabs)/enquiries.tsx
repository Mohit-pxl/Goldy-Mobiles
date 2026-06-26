import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import { SkeletonRow } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, Inquiry } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export default function EnquiriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-inquiries"],
    queryFn: async () => {
      const res = await apiGet<Inquiry[]>("/inquiries?userId=me");
      return res.data;
    },
    enabled: !!user,
  });

  const enquiries = data || [];

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " · " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>My Enquiries</Text>
        <View style={{ width: 22 }} />
      </View>

      {!user ? (
        <EmptyState icon="person-outline" title="Sign in required" subtitle="Sign in to see your enquiry history" />
      ) : isLoading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      ) : enquiries.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No enquiries yet" subtitle="Enquire on a product to see your history here" />
      ) : (
        <FlatList
          data={enquiries}
          keyExtractor={(e) => e._id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/product/${item.product._id}`)}
            >
              <View style={[styles.thumb, { backgroundColor: colors.bg4 }]}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.text3} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.product.name}</Text>
                <Text style={[styles.sub, { color: colors.text3 }]}>Enquired · {formatDate(item.createdAt)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  const msg = encodeURIComponent(`Hi, I'm interested in ${item.product.name} (₹${item.product.sellingPrice.toLocaleString("en-IN")}). Is it available?`);
                  Linking.openURL(`https://wa.me/?text=${msg}`);
                }}
                hitSlop={8}
              >
                <Ionicons name="logo-whatsapp" size={22} color={colors.whatsapp} />
              </Pressable>
            </Pressable>
          )}
        />
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  thumb: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
});

