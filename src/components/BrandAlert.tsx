import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { colors, fonts, spacing, radius } from '../styles/theme';

interface AlertButton {
  label: string;
  onPress: () => void;
  style?: 'default' | 'danger' | 'cancel';
}

interface BrandAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function BrandAlert({ visible, title, message, buttons }: BrandAlertProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttons}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  btn.style === 'danger' && styles.btnDanger,
                  btn.style === 'cancel' && styles.btnCancel,
                ]}
                onPress={btn.onPress}
                activeOpacity={0.85}
              >
                <Text style={[
                  styles.btnText,
                  btn.style === 'danger' && styles.btnTextDanger,
                  btn.style === 'cancel' && styles.btnTextCancel,
                ]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function useBrandAlert() {
  const [alertConfig, setAlertConfig] = useState<BrandAlertProps>({
    visible: false, title: '', buttons: [],
  });

  const showAlert = (title: string, message: string, buttons: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  return { alertConfig, showAlert, hideAlert };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  box: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, width: '100%', maxWidth: 320,
  },
  title: {
    fontFamily: fonts.montserratBold, fontSize: 17,
    color: colors.text, textAlign: 'center', marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.inter, fontSize: 13,
    color: colors.textLight, textAlign: 'center', marginBottom: spacing.lg,
  },
  buttons: { gap: spacing.sm },
  btn: {
    borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', backgroundColor: colors.accent,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
  btnText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  btnTextDanger: { color: '#fff' },
  btnTextCancel: { color: colors.text },
});
