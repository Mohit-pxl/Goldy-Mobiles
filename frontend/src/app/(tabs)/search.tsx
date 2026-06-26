import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StockBadge from "@/components/StockBadge";
import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";

const RECENT_KEY = "recent_searches";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) setRecent(JSON.parse(raw));
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await apiGet<Product[]>(`/catalog/products?search=${encodeURIComponent(q)}`);
      setResults(res.data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleChange = (t: string) => {
    setQuery(t);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(t), 350);
  };

  const saveRecent = async (q: string) => {
    if (!q.trim()) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const handleSubmit = () => { saveRecent(query); doSearch(query); };
  const handleChipPress = (q: string) => { setQuery(q); saveRecent(q); doSearch(q); };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: colors.bg3, borderColor: query ? colors.primary : colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.text3} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search products..."
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={handleChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setResults([]); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text3} />
            </Pressable>
          )}
        </View>
      </View>

      {!query && recent.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>Recent searches</Text>
          <View style={styles.chips}>
            {recent.map((r) => (
              <Pressable key={r} style={[styles.chip, { backgroundColor: colors.bg3, borderColor: colors.border2 }]} onPress={() => handleChipPress(r)}>
                <Text style={[styles.chipText, { color: colors.text2 }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {query.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          {searching ? (
            <Text style={[styles.statusText, { color: colors.text3 }]}>Searching...</Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.text3 }]}>{results.length} results for "{query}"</Text>
          )}
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => { saveRecent(query); router.push(`/product/${item._id}`); }}
          >
            <View style={[styles.thumb, { backgroundColor: colors.bg4 }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.text3} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.productSub, { color: colors.text3 }]}>{item.brand} · {fmt(item.sellingPrice)}</Text>
            </View>
            <StockBadge stock={item.stock} threshold={item.lowStockThreshold} compact />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusText: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  thumb: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0 },
  productName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  productSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
});

