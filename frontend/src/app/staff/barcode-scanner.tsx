import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";

export default function BarcodeScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnMode } = useLocalSearchParams<{ returnMode?: string }>();
  const isRawMode = returnMode === "barcode";

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || resolving) return;
    setScanned(true);
    setLastCode(data);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isRawMode) {
      router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/');
      router.setParams({ scannedBarcode: data });
      return;
    }

    setResolving(true);
    try {
      const res = await apiGet<Product>(`/products/barcode/${encodeURIComponent(data)}`);
      const product = res.data;
      router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/');
      router.setParams({ scannedProductId: product._id, scannedProductName: product.name });
    } catch {
      setError(`No product found for barcode "${data}"`);
      cooldownRef.current = setTimeout(() => {
        setScanned(false);
        setResolving(false);
        setError(null);
      }, 2000);
    } finally {
      setResolving(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setLastCode(null);
    setError(null);
    setResolving(false);
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        <Ionicons name="camera-outline" size={64} color={colors.text3} />
        <Text style={[styles.unavailableText, { color: colors.text2 }]}>
          Camera scanning is only available on a real device.
        </Text>
        <Text style={[styles.unavailableSub, { color: colors.text3 }]}>
          Use the barcode text input instead.
        </Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')}
        >
          <Text style={{ color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold" }}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Ionicons name="camera-outline" size={56} color={colors.text3} />
        <Text style={styles.permTitle}>Camera permission required</Text>
        <Text style={styles.permSub}>
          Goldy Mobiles needs camera access to scan product barcodes.
        </Text>
        <Pressable
          style={[styles.permBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={{ color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 }}>
            Allow camera access
          </Text>
        </Pressable>
        <Pressable onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.text3, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Cancel
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fullscreen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "code93",
            "qr",
            "datamatrix",
            "itf14",
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.canGoBack() ? router.back() : router.replace('/') : router.replace('/')}
          style={[styles.circleBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.scanTitle}>
          {isRawMode ? "Scan barcode" : "Scan product barcode"}
        </Text>
        <Pressable
          onPress={() => setTorch((v) => !v)}
          style={[styles.circleBtn, { backgroundColor: torch ? "rgba(232,168,37,0.7)" : "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.overlayCenter}>
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {resolving && (
            <View style={styles.resolving}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorPill}>
            <Ionicons name="alert-circle" size={14} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {lastCode && !error && !resolving && (
          <View style={styles.successPill}>
            <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
            <Text style={styles.successText}>{lastCode}</Text>
          </View>
        )}

        {!error && !lastCode && (
          <Text style={styles.hint}>Point camera at a barcode or QR code</Text>
        )}
      </View>

      {scanned && !resolving && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[styles.rescanBtn, { backgroundColor: colors.primary }]}
            onPress={resetScan}
          >
            <Ionicons name="scan-outline" size={16} color="#000" />
            <Text style={{ color: "#000", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 13 }}>
              Scan another
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = "#e8a825";

const styles = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeBtn: { padding: 6 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  reticle: {
    width: 230,
    height: 150,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  resolving: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
  },
  hint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(43,13,13,0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#f87171",
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    maxWidth: 220,
    textAlign: "center",
  },
  successPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(13,43,26,0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  successText: {
    color: "#4ade80",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  unavailableText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  unavailableSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  permTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  permSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
});

