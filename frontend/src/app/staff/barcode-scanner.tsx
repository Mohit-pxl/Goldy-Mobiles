import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { apiGet, Product } from "@/services/api";

type ScannedCode = {
  data: string;
  type: string;
  category: "EAN/UPC" | "IMEI" | "Serial" | "QR" | "Unknown";
  subLabel: string;
  isRecommended: boolean;
};

export default function BarcodeScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnMode, returnPath, productId, expectedCategory } = useLocalSearchParams<{
    returnMode?: string;
    returnPath?: string;
    productId?: string;
    expectedCategory?: string; // "EAN/UPC", "IMEI", "Serial"
  }>();
  
  const isRawMode = returnMode === "barcode";

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [detectedCodes, setDetectedCodes] = useState<ScannedCode[]>([]);
  const [selectedCodeData, setSelectedCodeData] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const codesMapRef = useRef<Map<string, ScannedCode>>(new Map());

  // Determine category based on string pattern
  const categorizeCode = (data: string, type: string): Omit<ScannedCode, "data" | "type" | "isRecommended"> => {
    if (type.includes("qr")) {
      return { category: "QR", subLabel: "Website / Support / QR" };
    }
    if (/^\d{15}$/.test(data)) {
      return { category: "IMEI", subLabel: "Device IMEI" };
    }
    if (/^\d{12,13}$/.test(data) || type.includes("ean") || type.includes("upc")) {
      return { category: "EAN/UPC", subLabel: "Product / Retail Barcode" };
    }
    if (data.length > 5 && /[A-Z0-9]/.test(data)) {
      return { category: "Serial", subLabel: "Serial Number" };
    }
    return { category: "Unknown", subLabel: "Other Barcode" };
  };

  const handleBarCodeScanned = ({ data, type }: { data: string; type: string }) => {
    if (!isScanning) return;

    if (!codesMapRef.current.has(data)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const info = categorizeCode(data, type);
      const isRecommended = expectedCategory ? info.category === expectedCategory : info.category === "EAN/UPC";

      const newCode: ScannedCode = {
        data,
        type,
        category: info.category,
        subLabel: info.subLabel,
        isRecommended,
      };

      codesMapRef.current.set(data, newCode);
      
      const newArray = Array.from(codesMapRef.current.values());
      // Sort recommended first
      newArray.sort((a, b) => (a.isRecommended === b.isRecommended ? 0 : a.isRecommended ? -1 : 1));
      
      setDetectedCodes(newArray);
      
      if (!selectedCodeData && newArray.length > 0) {
        setSelectedCodeData(newArray[0].data);
      }
    }
  };

  const handleUseSelectedCode = async () => {
    if (!selectedCodeData) return;
    
    setIsScanning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isRawMode) {
      if (returnPath) {
        const params: any = { scannedBarcode: selectedCodeData };
        if (productId) {
          params.id = productId;
          params.productId = productId;
        }
        router.navigate({ pathname: returnPath as any, params });
      } else {
        router.canGoBack() ? router.back() : router.replace('/');
        setTimeout(() => router.setParams({ scannedBarcode: selectedCodeData }), 10);
      }
      return;
    }

    setResolving(true);
    setError(null);
    try {
      const res = await apiGet<Product & { foundIdentifier?: { code: string } }>(`/products/barcode/${encodeURIComponent(selectedCodeData)}`);
      const product = res.data;
      router.canGoBack() ? router.back() : router.replace('/');
      
      const params: any = { 
        scannedProductId: product._id, 
        scannedProductName: product.name,
        scanTimestamp: Date.now().toString()
      };
      if (product.foundIdentifier) {
        params.scannedIdentifier = product.foundIdentifier.code;
      }
      setTimeout(() => router.setParams(params), 10);
    } catch {
      setError(`No product found for barcode "${selectedCodeData}"`);
      setTimeout(() => {
        setIsScanning(true);
        setResolving(false);
        setError(null);
        codesMapRef.current.clear();
        setDetectedCodes([]);
        setSelectedCodeData(null);
      }, 2000);
    } finally {
      setResolving(false);
    }
  };

  const resetScan = () => {
    setIsScanning(true);
    codesMapRef.current.clear();
    setDetectedCodes([]);
    setSelectedCodeData(null);
    setError(null);
    setResolving(false);
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.closeBtn}>
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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ marginTop: 12 }}>
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
            "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "qr", "datamatrix", "itf14",
          ],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={[styles.circleBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.scanTitle}>
          Scan Barcode
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
        {!isScanning && (
          <View style={styles.reticleDimmed}>
            {resolving && (
              <View style={styles.resolving}>
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            )}
          </View>
        )}
        
        {isScanning && (
          <View style={styles.reticle}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        )}
      </View>
      
      {/* Detected Codes Selection Sheet */}
      {detectedCodes.length > 0 && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom || 24 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Detected Codes ({detectedCodes.length})</Text>
            <Pressable onPress={resetScan} style={styles.sheetCloseBtn}>
               <Ionicons name="refresh" size={20} color={colors.text2} />
            </Pressable>
          </View>
          
          <Text style={styles.sheetSubtitle}>Select the correct code to continue</Text>
          
          <ScrollView style={styles.codeList} contentContainerStyle={styles.codeListContent} showsVerticalScrollIndicator={false}>
            {detectedCodes.map((code) => {
              const isSelected = selectedCodeData === code.data;
              return (
                <Pressable
                  key={code.data}
                  style={[
                    styles.codeItem,
                    { 
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? `${colors.primary}10` : colors.card,
                    }
                  ]}
                  onPress={() => setSelectedCodeData(code.data)}
                >
                  <View style={styles.codeItemLeft}>
                    <View style={[styles.codeTypeBadge, { backgroundColor: code.category === 'IMEI' ? '#e0f2fe' : '#f3f4f6' }]}>
                      <Text style={[styles.codeTypeText, { color: code.category === 'IMEI' ? '#0369a1' : '#4b5563' }]}>
                        {code.category}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.codeItemMid}>
                    <Text style={styles.codeData}>{code.data}</Text>
                    <Text style={styles.codeSub}>{code.subLabel}</Text>
                    {code.isRecommended && (
                      <Text style={[styles.recommendedText, { color: colors.primary }]}>Recommended</Text>
                    )}
                  </View>
                  <View style={styles.codeItemRight}>
                    <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          
          <View style={styles.actionContainer}>
            {error && (
              <View style={styles.errorPill}>
                <Ionicons name="alert-circle" size={14} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <Pressable
              style={[styles.useCodeBtn, { backgroundColor: colors.primary }]}
              onPress={handleUseSelectedCode}
              disabled={resolving || !selectedCodeData}
            >
              {resolving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.useCodeBtnText}>Use Selected Code</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {isScanning && detectedCodes.length === 0 && (
         <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 24 }]}>
           <Text style={styles.hint}>Point camera at the barcode / QR code{'\n'}on the product box</Text>
         </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = "#fff";

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
    fontSize: 16,
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
  },
  reticle: {
    width: 250,
    height: 250,
    position: "relative",
  },
  reticleDimmed: {
    width: 250,
    height: 250,
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
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  resolving: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 30,
    padding: 16,
  },
  bottomHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  hint: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
  },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '60%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#111827',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  codeList: {
    flex: 1,
  },
  codeListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codeItemLeft: {
    width: 64,
    alignItems: 'center',
    marginRight: 12,
  },
  codeTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  codeTypeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  codeItemMid: {
    flex: 1,
  },
  codeData: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#111827',
    marginBottom: 2,
  },
  codeSub: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter_400Regular',
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  codeItemRight: {
    paddingLeft: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionContainer: {
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  useCodeBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useCodeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
