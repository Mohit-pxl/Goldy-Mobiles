import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import SignOutModal from "@/components/SignOutModal";

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showSignOut, setShowSignOut] = React.useState(false);

  const isAdmin = user?.role === "admin";
  const canViewReports = user?.permissions?.canViewReports || isAdmin;
  const canManageStaff = user?.permissions?.canManageStaff || isAdmin;

  const MenuItem = ({
    icon,
    label,
    subtitle,
    onPress,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle?: string;
    onPress: () => void;
    color?: string;
  }) => (
    <Pressable style={[styles.item, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: colors.bg3 }]}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, { color: color || colors.foreground }]}>{label}</Text>
        {subtitle && <Text style={[styles.itemSub, { color: colors.text3 }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.text3} />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.bg3 }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>{user?.role || "staff"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        <View style={[styles.userCard, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "S"}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name || "Staff User"}</Text>
            <Text style={[styles.userEmail, { color: colors.text3 }]}>{user?.email}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Operations</Text>
        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <MenuItem icon="people-outline" label="Khata / Ledger" subtitle="Customer dues and credit" onPress={() => router.push("/staff/khata")} />
          <MenuItem icon="document-text-outline" label="Quotations" subtitle="Manage quotes and estimates" onPress={() => router.push("/staff/quotations")} />
          <MenuItem icon="wallet-outline" label="Expenses" subtitle="Track shop expenses" onPress={() => router.push("/staff/expenses")} />
        </View>

        {canViewReports && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Analytics</Text>
            <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
              <MenuItem icon="bar-chart-outline" label="Reports" subtitle="Sales, profit & loss, top products" onPress={() => router.push("/staff/reports")} />
            </View>
          </>
        )}

        {canManageStaff && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Admin</Text>
            <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
              <MenuItem icon="images-outline" label="Manage Banners" subtitle="Home page sliders" onPress={() => router.push("/staff/banners")} color={colors.primary} />
              <MenuItem icon="people-circle-outline" label="Staff Management" subtitle="Roles and permissions" onPress={() => router.push("/staff/staff-mgmt")} color={colors.redText} />
              <MenuItem icon="people" label="User Management" subtitle="Manage all users" onPress={() => router.push("/staff/users-mgmt")} color={colors.primary} />
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Settings</Text>
        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <MenuItem 
            icon={theme === "light" ? "moon-outline" : "sunny-outline"} 
            label={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"} 
            subtitle="Change app appearance"
            onPress={toggleTheme} 
          />
        </View>

        <View style={[styles.section, { borderTopColor: colors.border, borderBottomColor: colors.border, marginTop: 16 }]}>
          <MenuItem icon="log-out-outline" label="Sign out" onPress={() => setShowSignOut(true)} color={colors.destructive} />
        </View>
      </ScrollView>

      <SignOutModal visible={showSignOut} onClose={() => setShowSignOut(false)} />
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
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  userName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter_500Medium", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  section: { borderTopWidth: 1 },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  itemSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
