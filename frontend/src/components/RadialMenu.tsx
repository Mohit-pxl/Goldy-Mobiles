import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export interface RadialOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onSelect: () => void;
}

interface RadialMenuProps {
  options: RadialOption[];
}

export default function RadialMenu({ options }: RadialMenuProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = (callback?: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
      if (callback) callback();
    });
  };

  const handleSelect = (option: RadialOption) => {
    Haptics.selectionAsync();
    closeMenu(() => option.onSelect());
  };

  const radius = 100; // Distance of items from center
  const angleStep = (2 * Math.PI) / options.length;

  return (
    <>
      <Pressable
        onLongPress={openMenu}
        onPress={openMenu} // Also open on tap for accessibility
        style={({ pressed }) => [
          styles.mainBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons name="apps" size={20} color="#000" />
        <Text style={styles.mainBtnText}>Actions</Text>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => closeMenu()}>
        <View style={styles.modalRoot}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />
          )}

          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeMenu()} />

          <View style={styles.centerContainer} pointerEvents="box-none">
            {/* Center Close Button */}
            <Animated.View
              style={[
                styles.centerBtn,
                {
                  transform: [
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                    { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["-90deg", "0deg"] }) }
                  ],
                },
              ]}
            >
              <Pressable onPress={() => closeMenu()} hitSlop={20}>
                <Ionicons name="close" size={32} color="#fff" />
              </Pressable>
            </Animated.View>

            {/* Radial Options */}
            {options.map((opt, i) => {
              const angle = i * angleStep - Math.PI / 2; // Start from top (-90 deg)
              const translateX = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, radius * Math.cos(angle)],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, radius * Math.sin(angle)],
              });
              const scale = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.5, 1.2, 1],
              });
              const opacity = anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 1],
              });

              return (
                <Animated.View
                  key={opt.id}
                  style={[
                    styles.optionContainer,
                    {
                      opacity,
                      transform: [{ translateX }, { translateY }, { scale }],
                    },
                  ]}
                >
                  <Pressable
                    style={[styles.optionBtn, { backgroundColor: opt.color }]}
                    onPress={() => handleSelect(opt)}
                  >
                    <Ionicons name={opt.icon} size={24} color="#fff" />
                  </Pressable>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mainBtnText: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#000",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    width: 250,
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  centerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  optionContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 100,
  },
  optionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 8,
  },
  optionLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
