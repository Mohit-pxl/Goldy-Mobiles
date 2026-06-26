import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import SignOutModal from "@/components/SignOutModal";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showSignOut, setShowSignOut] = React.useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await apiGet<{ whatsappNumber?: string }>("/settings");
      return res.data;
    },
  });

  const handleLogout = () => {
    setShowSignOut(true);
  };

  const MenuItem = ({ icon, label, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) => (
    <Pressable style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.bg3 }]}>
        <Ionicons name={icon} size={18} color={color || colors.text2} />
      </View>
      <Text style={[styles.menuLabel, { color: color || colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.text3} />
    </Pressable>
  );

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>
        <View style={styles.guestCenter}>
          <Ionicons name="person-circle-outline" size={64} color={colors.text3} />
          <Text style={[styles.guestTitle, { color: colors.text2 }]}>Not signed in</Text>
          <Text style={[styles.guestSub, { color: colors.text3 }]}>Sign in to track your enquiries and wishlist across devices</Text>
          <Pressable
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={() => logout()}
          >
            <Text style={{ fontFamily: "Inter_700Bold", color: "#000", fontSize: 14 }}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        <View style={[styles.avatarRow, { backgroundColor: colors.bg2, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.userEmail, { color: colors.text3 }]}>{user.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.bg3 }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{user.role}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Account</Text>
          <MenuItem icon="receipt-outline" label="My Enquiries" onPress={() => router.push("/(tabs)/enquiries")} />
          <MenuItem icon="heart-outline" label="Wishlist" onPress={() => router.push("/(tabs)/wishlist")} />
        </View>

        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Settings</Text>
          <MenuItem 
            icon={theme === "light" ? "moon-outline" : "sunny-outline"} 
            label={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"} 
            onPress={toggleTheme} 
          />
        </View>

        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Support</Text>
          <MenuItem 
            icon="call-outline" 
            label="Call us: +91 79875 22364" 
            color={colors.primary}
            onPress={() => {
              Linking.openURL("tel:+917987522364").catch(() => {
                Alert.alert("Error", "Could not open dialer.");
              });
            }} 
          />
          <MenuItem 
            icon="logo-whatsapp" 
            label="Contact on WhatsApp" 
            color="#25D366"
            onPress={() => {
              const phone = settings?.whatsappNumber || "+917987522364";
              const text = encodeURIComponent(`Hi, my name is ${user.name}`);
              Linking.openURL(`whatsapp://send?phone=${phone.replace(/\D/g, '')}&text=${text}`).catch(() => {
                Alert.alert("WhatsApp Not Found", "Please install WhatsApp to use this feature.");
              });
            }} 
          />
          <MenuItem 
            icon="logo-instagram" 
            label="Follow us on Instagram" 
            color="#E1306C"
            onPress={() => {
              Linking.openURL("https://www.instagram.com/goldymobilemanawar?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==").catch(() => {
                Alert.alert("Error", "Could not open Instagram.");
              });
            }} 
          />
          <MenuItem 
            icon="logo-facebook" 
            label="Like us on Facebook" 
            color="#1877F2"
            onPress={() => {
              Linking.openURL("https://www.facebook.com/goldymobile2222/?ref=PRODASH_UPSELL_xav_ig_profile_page_web#").catch(() => {
                Alert.alert("Error", "Could not open Facebook.");
              });
            }} 
          />
        </View>

        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border, marginTop: 16 }]}>
          <MenuItem icon="log-out-outline" label="Sign out" onPress={handleLogout} color={colors.destructive} />
        </View>
      </ScrollView>

      <SignOutModal visible={showSignOut} onClose={() => setShowSignOut(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  guestCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  guestTitle: { fontSize: 18, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  guestSub: { fontSize: 13, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
  signInBtn: { paddingVertical: 13, paddingHorizontal: 32, borderRadius: 10, marginTop: 8 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 6,
  },
  roleText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  section: { borderTopWidth: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
