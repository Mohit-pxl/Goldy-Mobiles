import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<View>(null);
  
  const anim = useRef(new Animated.Value(0)).current;
  const selectedIndexRef = useRef<number | null>(null);
  
  const angleStep = (2 * Math.PI) / options.length;
  const optionAngles = options.map((_, i) => i * angleStep - Math.PI / 2);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      buttonRef.current?.measureInWindow((x, y) => {
        setBtnPos({ x, y });
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsOpen(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: false,
      }).start();
    }
  };

  const closeMenu = (callback?: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setIsOpen(false);
      setSelectedIndex(null);
      if (callback) callback();
    });
  };

  const radius = 100;

  return (
    <View style={{ zIndex: isOpen ? 999 : 1 }} ref={buttonRef}>
      <Pressable
        onPress={toggleMenu}
        style={[
          styles.mainBtn,
          { backgroundColor: colors.primary, opacity: isOpen ? 0.8 : 1 },
        ]}
      >
        <Ionicons name={isOpen ? "close" : "apps"} size={20} color="#000" />
        <Text style={styles.mainBtnText}>{isOpen ? "Close" : "Actions"}</Text>
      </Pressable>

      {isOpen && (
        <View style={styles.overlayWrapper} pointerEvents="box-none">
          <View style={[styles.centerContainer, {
             position: 'absolute',
             left: (width / 2) - btnPos.x - 125, // 125 is half of 250 (centerContainer width)
             top: (height / 2) - btnPos.y - 125,
          }]} pointerEvents="box-none">
            {/* Radial Options */}
            {options.map((opt, i) => {
              const angle = optionAngles[i];
              
              const translateX = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, radius * Math.cos(angle)],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, radius * Math.sin(angle)],
              });
              const scale = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
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
                    onPress={() => {
                      Haptics.selectionAsync();
                      closeMenu(() => opt.onSelect());
                    }}
                    style={{ alignItems: "center" }}
                  >
                    <View style={[styles.optionBtn, { backgroundColor: colors.bg4 }]}>
                      <Ionicons name={opt.icon} size={24} color={colors.text2} />
                    </View>
                    <Text style={[styles.optionLabel, { color: colors.text2 }]}>{opt.label}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}
    </View>
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
  overlayWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  centerContainer: {
    width: 250,
    height: 250,
    justifyContent: "center",
    alignItems: "center",
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
