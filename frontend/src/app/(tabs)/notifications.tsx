import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import EmptyState from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    type: "info",
    icon: "help-circle-outline" as const,
    title: "Enquiry Received",
    message: "We have received your enquiry for iPhone 15 Pro. Our team will contact you shortly.",
    time: "10m ago",
  },
  {
    id: "2",
    type: "success",
    icon: "document-text-outline" as const,
    title: "New Invoice",
    message: "A new invoice #INV-2023 for your recent purchase has been generated.",
    time: "1h ago",
  },
  {
    id: "3",
    type: "info",
    icon: "cube-outline" as const,
    title: "Order Dispatched",
    message: "Your order for AirPods Pro has been dispatched and is on its way.",
    time: "2h ago",
  },
  {
    id: "4",
    type: "success",
    icon: "checkmark-circle-outline" as const,
    title: "Payment Successful",
    message: "Your payment of ₹15,000 was successfully processed.",
    time: "1d ago",
  },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "warning": return colors.amberText;
      case "success": return colors.greenText;
      case "info":
      default: return colors.blueText;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "warning": return colors.amberBg;
      case "success": return colors.greenBg;
      case "info":
      default: return colors.blueBg;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text2} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        </View>
        {notifications.length > 0 && (
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="All caught up!"
          subtitle="You have no new notifications right now."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: getIconBg(item.type) }]}>
                <Ionicons name={item.icon} size={20} color={getIconColor(item.type)} />
              </View>
              <View style={styles.content}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.time, { color: colors.text3 }]}>{item.time}</Text>
                </View>
                <Text style={[styles.message, { color: colors.text2 }]}>{item.message}</Text>
              </View>
              <Pressable onPress={() => removeNotification(item.id)} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={colors.text3} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  message: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  closeBtn: {
    marginLeft: 4,
    padding: 4,
  },
});
