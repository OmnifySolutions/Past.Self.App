import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors, fonts, spacing, radius } from '../styles/theme';

interface BrandModalProps {
  visible: boolean;
  title: string;
  body: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  danger?: boolean;
  icon?: string;
}

export function BrandModal({
  visible, title, body,
  confirmText = 'OK', cancelText = 'Cancel',
  onConfirm, onCancel, danger = false, icon = '!'
}: BrandModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={[styles.iconCircle, danger && styles.iconCircleDanger]}>
            <Text style={[styles.iconText, danger && styles.iconTextDanger]}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.buttons}>
            {onCancel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, danger && styles.confirmBtnDanger, !onCancel && styles.confirmFull]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, width: '100%', maxWidth: 320,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  iconCircleDanger: { backgroundColor: '#f5e8eb' },
  iconText: { fontFamily: fonts.montserratBold, fontSize: 20, color: colors.accent },
  iconTextDanger: { color: colors.danger },
  title: {
    fontFamily: fonts.montserratBold, fontSize: 17,
    color: colors.text, textAlign: 'center', marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.inter, fontSize: 13,
    color: colors.textLight, textAlign: 'center', marginBottom: spacing.lg,
  },
  buttons: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  cancelBtn: {
    flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.accent, alignItems: 'center',
  },
  cancelText: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  confirmBtn: {
    flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  confirmBtnDanger: { backgroundColor: colors.danger },
  confirmFull: { flex: 1 },
  confirmText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
});
