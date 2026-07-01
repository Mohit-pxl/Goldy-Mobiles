import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch, apiPost, Product } from "@/services/api";

const CATEGORIES = ["Mobiles", "Audio", "Earphones", "Chargers", "Smart Watches", "Laptops", "Accessories", "Other"];
const GST_RATES = [0, 5, 12, 18, 28];
const TRACKING_TYPES = [
  { label: "IMEI", value: "IMEI" },
  { label: "Serial Number", value: "SERIAL" },
  { label: "Quantity Only", value: "QUANTITY" },
] as const;
const COLOR_OPTIONS = ["Black", "White", "Blue", "Green", "Gold", "Silver", "Purple", "Red"];

interface Spec { key: string; value: string }

const Label = ({ text, required }: { text: string; required?: boolean }) => {
  const colors = useColors();
  return (
    <Text style={[styles.label, { color: colors.text3 }]}>
      {text}{required && " *"}
    </Text>
  );
};

const Field = ({ label: lbl, value, onChange, placeholder, keyboardType = "default", required = false, editable = true }: {
  label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad"; required?: boolean; editable?: boolean;
}) => {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Label text={lbl} required={required} />
      <TextInput
        style={[styles.input, { color: editable ? colors.foreground : colors.text3, backgroundColor: colors.bg3, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || lbl}
        placeholderTextColor={colors.text3}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
  );
};

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEdit = !!id;
  const isAdmin = user?.role === "admin";
  const canEditPrice = user?.permissions?.canEditPrice || isAdmin;

  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "Mobiles",
    subcategory: "",
    model: "",
    variant: "",
    trackingType: "IMEI",
    sellingPrice: "",
    mrp: "",
    costPrice: "",
    lowStockThreshold: "5",
    gstPercent: "18",
    hsnCode: "",
    sku: "",
    description: "",
  });
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("");
  const [specs, setSpecs] = useState<Spec[]>([{ key: "", value: "" }]);

  useEffect(() => {
    if (isEdit) {
      apiGet<Product>(`/products/${id}`).then((res) => {
        const p = res.data;
        setForm({
          name: p.name,
          brand: p.brand,
          category: p.category,
          subcategory: p.subcategory || "",
          model: p.model || "",
          variant: p.variant || "",
          trackingType: p.trackingType || (p.trackImei ? "IMEI" : p.trackSerial ? "SERIAL" : "QUANTITY"),
          sellingPrice: String(p.sellingPrice),
          mrp: String(p.mrp || ""),
          costPrice: String(p.costPrice || ""),
          lowStockThreshold: String(p.lowStockThreshold),
          gstPercent: String(p.gstPercent),
          hsnCode: p.hsnCode || "",
          sku: p.sku || p.internalCode || "",
          description: p.description || "",
        });
        setAvailableColors(p.availableColors || []);
        if (p.specifications) setSpecs(p.specifications.length ? p.specifications : [{ key: "", value: "" }]);
        if (p.images) setImages(p.images);
      }).catch(() => { });
    }
  }, [id, isEdit]);



  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const toggleColor = (color: string) => {
    setAvailableColors((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]);
  };
  const addCustomColor = () => {
    const color = customColor.trim();
    if (color && !availableColors.includes(color)) setAvailableColors((prev) => [...prev, color]);
    setCustomColor("");
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera permissions to use this feature.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleAddImage = () => {
    setShowImageModal(true);
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const addSpec = () => setSpecs((prev) => [...prev, { key: "", value: "" }]);
  const setSpec = (i: number, field: "key" | "value", val: string) => {
    setSpecs((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.name.trim() || !form.brand.trim()) {
      Alert.alert("Required fields", "Name and brand are required.");
      return;
    }
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) {
      Alert.alert("Required fields", "Enter a valid selling price.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        subcategory: form.subcategory || undefined,
        model: form.model || undefined,
        variant: form.variant || undefined,
        availableColors,
        trackingType: form.trackingType,
        sellingPrice: Number(form.sellingPrice),
        mrp: form.mrp ? Number(form.mrp) : undefined,
        costPrice: isAdmin && form.costPrice ? Number(form.costPrice) : undefined,
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        gstPercent: Number(form.gstPercent || 0),
        hsnCode: form.hsnCode || undefined,
        sku: form.sku || undefined,
        internalCode: form.sku || undefined,
        description: form.description || undefined,
        specifications: specs.filter((s) => s.key && s.value),
        images: images,
      };

      if (isEdit) {
        await apiPatch(`/products/${id}`, payload);
      } else {
        await apiPost("/products", payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/');
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text2} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>{isEdit ? "Edit Product" : "Add Product"}</Text>
          <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          <Text style={[styles.section, { color: colors.primary }]}>Basic Info</Text>
          <Field label="Product name" value={form.name} onChange={(v) => set("name", v)} required />
          <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)} required />
          <Field label="Subcategory" value={form.subcategory} onChange={(v) => set("subcategory", v)} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Model" value={form.model} onChange={(v) => set("model", v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Variant" value={form.variant} onChange={(v) => set("variant", v)} />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Label text="Category" required />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} style={[styles.catChip, { backgroundColor: form.category === c ? colors.primary : colors.bg3, borderColor: form.category === c ? colors.primary : colors.border2 }]} onPress={() => set("category", c)}>
                  <Text style={{ color: form.category === c ? "#000" : colors.text2, fontSize: 12, fontFamily: "Inter_500Medium" }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.fieldGroup}>
            <Label text="Available colors" />
            <View style={styles.wrapRow}>
              {Array.from(new Set([...COLOR_OPTIONS, ...availableColors])).map((c) => {
                const active = availableColors.includes(c);
                return (
                  <Pressable key={c} style={[styles.catChip, { backgroundColor: active ? colors.primary : colors.bg3, borderColor: active ? colors.primary : colors.border2 }]} onPress={() => toggleColor(c)}>
                    <Text style={{ color: active ? "#000" : colors.text2, fontSize: 12, fontFamily: "Inter_500Medium" }}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
                value={customColor}
                onChangeText={setCustomColor}
                placeholder="Add custom color"
                placeholderTextColor={colors.text3}
                onSubmitEditing={addCustomColor}
              />
              <Pressable style={[styles.autoBtn, { backgroundColor: colors.bg4, borderColor: colors.border2 }]} onPress={addCustomColor}>
                <Ionicons name="add" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.section, { color: colors.primary }]}>Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <Pressable style={styles.removeImageBtn} onPress={() => removeImage(i)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable style={[styles.addImageBtn, { borderColor: colors.border2, backgroundColor: colors.bg3 }]} onPress={handleAddImage}>
              <Ionicons name="image-outline" size={24} color={colors.text3} />
              <Text style={{ color: colors.text3, fontSize: 12, marginTop: 4 }}>Add Image</Text>
            </Pressable>
          </ScrollView>

          <Text style={[styles.section, { color: colors.primary }]}>Pricing</Text>
          <Field label="Selling price" value={form.sellingPrice} onChange={(v) => set("sellingPrice", v)} keyboardType="decimal-pad" required />
          <Field label="MRP (optional)" value={form.mrp} onChange={(v) => set("mrp", v)} keyboardType="decimal-pad" />
          {isAdmin && <Field label="Cost price (admin only)" value={form.costPrice} onChange={(v) => set("costPrice", v)} keyboardType="decimal-pad" />}

          <View style={styles.fieldGroup}>
            <Label text="GST %" />
            <View style={styles.gstRow}>
              {GST_RATES.map((r) => (
                <Pressable key={r} style={[styles.gstBtn, { backgroundColor: form.gstPercent === String(r) ? colors.primary : colors.bg3, borderColor: form.gstPercent === String(r) ? colors.primary : colors.border2 }]} onPress={() => set("gstPercent", String(r))}>
                  <Text style={{ color: form.gstPercent === String(r) ? "#000" : colors.text2, fontSize: 12, fontFamily: "Inter_700Bold" }}>{r}%</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Field label="HSN Code" value={form.hsnCode} onChange={(v) => set("hsnCode", v)} />

          <Text style={[styles.section, { color: colors.primary }]}>Inventory Setup</Text>
          <View style={styles.fieldGroup}>
            <Label text="Tracking type" required />
            <View style={styles.trackingGrid}>
              {TRACKING_TYPES.map((t) => {
                const active = form.trackingType === t.value;
                return (
                  <Pressable key={t.value} style={[styles.trackBtn, { backgroundColor: active ? colors.primary : colors.bg3, borderColor: active ? colors.primary : colors.border2 }]} onPress={() => set("trackingType", t.value)}>
                    <Text style={{ color: active ? "#000" : colors.text2, fontSize: 11, fontFamily: "Inter_700Bold" }}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Low stock alert" value={form.lowStockThreshold} onChange={(v) => set("lowStockThreshold", v)} keyboardType="numeric" />
            </View>
          </View>

          <Field label="SKU" value={form.sku} onChange={(v) => set("sku", v)} />

          <Text style={[styles.section, { color: colors.primary }]}>Specifications</Text>
          {specs.map((s, i) => (
            <View key={i} style={styles.specRow}>
              <TextInput style={[styles.specInput, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Key" placeholderTextColor={colors.text3} value={s.key} onChangeText={(v) => setSpec(i, "key", v)} />
              <TextInput style={[styles.specInput, { flex: 1, color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]} placeholder="Value" placeholderTextColor={colors.text3} value={s.value} onChangeText={(v) => setSpec(i, "value", v)} />
              <Pressable onPress={() => removeSpec(i)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={18} color={colors.text3} />
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.addSpecBtn, { borderColor: colors.border2 }]} onPress={addSpec}>
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Add spec</Text>
          </Pressable>

          <Text style={[styles.section, { color: colors.primary }]}>Description</Text>
          <TextInput
            style={[styles.textarea, { color: colors.foreground, backgroundColor: colors.bg3, borderColor: colors.border }]}
            value={form.description}
            onChangeText={(v) => set("description", v)}
            placeholder="Product description (optional)"
            placeholderTextColor={colors.text3}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>
      </View>

      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.bg2, borderColor: colors.border, width: '85%', borderRadius: 16, padding: 20, borderWidth: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 16 }}>Add Image</Text>
            
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setShowImageModal(false); takePhoto(); }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.foreground }}>Take Photo</Text>
            </Pressable>
            
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }} onPress={() => { setShowImageModal(false); pickImage(); }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="images" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_500Medium', color: colors.foreground }}>Choose from Gallery</Text>
            </Pressable>
            
            <Pressable style={{ marginTop: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border2, alignItems: 'center' }} onPress={() => setShowImageModal(false)}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text2 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, minWidth: 56, alignItems: "center" },
  saveBtnText: { color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 },
  section: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular" },
  textarea: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80 },
  catRow: { gap: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  gstRow: { flexDirection: "row", gap: 8 },
  gstBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  trackingGrid: { flexDirection: "row", gap: 8 },
  trackBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  row2: { flexDirection: "row", gap: 10 },
  barcodeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  autoBtn: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, borderWidth: 1 },
  specRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  specInput: { width: 110, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 12, fontFamily: "Inter_400Regular" },
  addSpecBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", borderStyle: "dashed" },
  imageScroll: { gap: 12 },
  imageWrapper: { width: 80, height: 80, borderRadius: 8, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removeImageBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  addImageBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
});

