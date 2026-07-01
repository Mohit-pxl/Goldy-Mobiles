import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useColors } from "@/hooks/useColors";
import { apiGet, Invoice } from "@/services/api";

type FilterType = "Date" | "Week" | "Month" | "Year";

export default function BillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<FilterType>("Month");
  const [showCalendar, setShowCalendar] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["all-invoices"],
    queryFn: async () => {
      // Fetching all recent for simplicity. A production app might want pagination.
      const res = await apiGet<Invoice[]>("/billing/invoices?limit=1000");
      return res.data || [];
    },
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const now = new Date();
    
    return invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      
      if (customDate) {
         return invDate.toISOString().split("T")[0] === customDate;
      }
      
      if (activeFilter === "Date") {
         return invDate.toDateString() === now.toDateString();
      }
      if (activeFilter === "Week") {
         const oneWeekAgo = new Date();
         oneWeekAgo.setDate(now.getDate() - 7);
         return invDate >= oneWeekAgo;
      }
      if (activeFilter === "Month") {
         return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }
      if (activeFilter === "Year") {
         return invDate.getFullYear() === now.getFullYear();
      }
      
      return true;
    });
  }, [invoices, activeFilter, customDate]);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const totalSales = filteredInvoices.reduce((sum, i) => sum + i.total, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Bills</Text>
          <Text style={[styles.sub, { color: colors.text3 }]}>
            {filteredInvoices.length} bills · Total {fmt(totalSales)}
          </Text>
        </View>
        <Pressable onPress={() => setShowCalendar(true)} style={styles.iconBtn}>
           <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {(["Date", "Week", "Month", "Year"] as FilterType[]).map((f) => {
          const isActive = activeFilter === f && !customDate;
          return (
            <Pressable
              key={f}
              style={[
                styles.filterChip,
                { backgroundColor: isActive ? colors.primary : colors.bg3, borderColor: isActive ? colors.primary : colors.border2 }
              ]}
              onPress={() => { setActiveFilter(f); setCustomDate(""); }}
            >
              <Text style={[styles.filterText, { color: isActive ? "#000" : colors.text2 }]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
      
      {customDate ? (
        <View style={[styles.customDatePill, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
           <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }}>Date: {customDate}</Text>
           <Pressable onPress={() => setCustomDate("")} hitSlop={8}>
             <Ionicons name="close-circle" size={18} color={colors.text3} />
           </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filteredInvoices}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, paddingTop: 8 }}
        ListEmptyComponent={isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={[styles.empty, { color: colors.text3 }]}>No bills found for the selected period</Text>
        )}
        renderItem={({ item: invoice }) => (
          <Pressable
            style={[styles.invRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/staff/invoice/${invoice._id}`)}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
               <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.invLeft}>
              <Text style={[styles.invNum, { color: colors.foreground }]}>{invoice.invoiceNumber}</Text>
              <Text style={[styles.invDate, { color: colors.text3 }]}>{fmtDate(invoice.createdAt)} · {invoice.customer?.name || "Walk-in"}</Text>
            </View>
            <View style={styles.invRight}>
              <Text style={[styles.invTotal, { color: colors.foreground }]}>
                {invoice.total < 0 ? `- ${fmt(Math.abs(invoice.total))}` : fmt(invoice.total)}
              </Text>
              <View style={[styles.modeBadge, { backgroundColor: invoice.paymentMode === "credit" ? colors.redBg : colors.greenBg }]}>
                <Text style={[styles.modeText, { color: invoice.paymentMode === "credit" ? colors.redText : colors.greenText }]}>
                  {invoice.paymentMode.toUpperCase()}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Calendar Picker */}
      {showCalendar && (
        <DateTimePicker
          value={customDate ? new Date(customDate) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowCalendar(false);
            }
            if (event.type === "set" && selectedDate) {
              setCustomDate(selectedDate.toISOString().split("T")[0]);
              setActiveFilter("Date"); // ensure filter is clear from others
            } else if (event.type === "dismissed") {
              setShowCalendar(false);
            }
          }}
        />
      )}
      
      {Platform.OS === 'ios' && showCalendar && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
               <View style={styles.modalHeader}>
                 <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Date</Text>
                 <Pressable onPress={() => setShowCalendar(false)}>
                   <Text style={{ color: colors.primary, fontWeight: '600' }}>Done</Text>
                 </Pressable>
               </View>
               <DateTimePicker
                  value={customDate ? new Date(customDate) : new Date()}
                  mode="date"
                  display="inline"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setCustomDate(selectedDate.toISOString().split("T")[0]);
                      setActiveFilter("Date");
                    }
                  }}
                />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  filterChip: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  filterText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  customDatePill: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12, padding: 10, borderWidth: 1, borderRadius: 8 },
  invRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  invLeft: { flex: 1 },
  invNum: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  invDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  invRight: { alignItems: "flex-end", gap: 4 },
  invTotal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  modeText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  empty: { textAlign: "center", paddingTop: 40, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  formInput: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  submitBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  submitText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
});
