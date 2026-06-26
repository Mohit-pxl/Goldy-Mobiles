import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function SignOutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { logout } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
        <View style={[styles.modalBox, { backgroundColor: colors.bg2, borderColor: colors.border }]}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: colors.redBg }]}>
              <Ionicons name="log-out" size={24} color={colors.redText} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Sign Out?</Text>
            <Text style={[styles.modalSub, { color: colors.text2 }]}>
              Are you sure you want to sign out of your account? You will need to log in again to access your data.
            </Text>
          </View>
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, { borderColor: colors.border2, borderWidth: 1 }]} onPress={onClose}>
              <Text style={[styles.btnText, { color: colors.text2 }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.destructive, borderWidth: 1, borderColor: colors.destructive }]} onPress={handleLogout}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.btnText, { color: '#fff' }]}>Sign Out</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  modalSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
