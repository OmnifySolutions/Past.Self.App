import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { purchaseMonthly, purchaseLifetime, restorePurchases } from '../utils/subscription';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

const FEATURES: { icon: string; text: string }[] = [
  { icon: 'infinite-outline',         text: 'Unlimited videos'                      },
  { icon: 'shield-checkmark-outline', text: 'App Guard — always play, every time'   },
  { icon: 'repeat-outline',           text: 'Repeat scheduling'                     },
  { icon: 'timer-outline',            text: 'Custom cooldown timer'                 },
];

type LoadingState = 'monthly' | 'lifetime' | 'restore' | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Optional short hint shown under the tagline — gives context for why the paywall appeared
  featureHint?: string;
};

export function PaywallModal({ visible, onClose, onSuccess, featureHint }: Props) {
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading]   = useState<LoadingState>(null);

  const sheetY  = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(sheetY, {
          toValue: 0, useNativeDriver: true,
          damping: 20, stiffness: 200,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  const handleMonthly = async () => {
    setLoading('monthly');
    const { success, error } = await purchaseMonthly();
    setLoading(null);
    if (success) { onSuccess?.(); onClose(); return; }
    if (error) Alert.alert('Purchase failed', error);
  };

  const handleLifetime = async () => {
    setLoading('lifetime');
    const { success, error } = await purchaseLifetime();
    setLoading(null);
    if (success) { onSuccess?.(); onClose(); return; }
    if (error) Alert.alert('Purchase failed', error);
  };

  const handleRestore = async () => {
    setLoading('restore');
    const restored = await restorePurchases();
    setLoading(null);
    if (restored) {
      onSuccess?.();
      onClose();
    } else {
      Alert.alert('No purchase found', 'No active Past.Self. Pro subscription was found for this account.');
    }
  };

  if (!rendered) return null;

  const isBusy = !!loading;
  const bottomPad = Math.max(spacing.lg, insets.bottom + spacing.md);

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay, opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }], paddingBottom: bottomPad }]}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.textLight} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.appName}>Past.Self.</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {featureHint ?? 'Your future self, upgraded.'}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon as any} size={18} color={colors.danger} style={styles.featureIcon} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Monthly CTA — primary */}
        <TouchableOpacity
          style={[styles.monthlyBtn, isBusy && styles.disabled]}
          onPress={handleMonthly}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.monthlyTitle}>
            {loading === 'monthly' ? 'Processing…' : 'Start 7-Day Free Trial'}
          </Text>
          <Text style={styles.monthlySub}>then €2.99 / month — cancel any time</Text>
        </TouchableOpacity>

        {/* Lifetime — secondary */}
        <TouchableOpacity
          style={[styles.lifetimeBtn, isBusy && styles.disabled]}
          onPress={handleLifetime}
          activeOpacity={0.7}
          disabled={isBusy}
        >
          <Text style={styles.lifetimeText}>
            {loading === 'lifetime' ? 'Processing…' : 'Or €8.99 once, forever →'}
          </Text>
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={isBusy}>
          <Text style={styles.restoreText}>
            {loading === 'restore' ? 'Checking…' : 'Restore purchases'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  appName: {
    fontFamily: fonts.brittany,
    fontSize: 38,
    color: colors.danger,
  },
  proBadge: {
    backgroundColor: '#9898d6',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proBadgeText: {
    fontFamily: fonts.montserratBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: fonts.montserratMedium,
    fontSize: 17,
    color: colors.text,
    lineHeight: 26,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIcon: { width: 26 },
  featureText: {
    fontFamily: fonts.inter,
    fontSize: 15,
    color: colors.text,
  },
  monthlyBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  disabled: { opacity: 0.55 },
  monthlyTitle: {
    fontFamily: fonts.montserratBold,
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  monthlySub: {
    fontFamily: fonts.inter,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  lifetimeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  lifetimeText: {
    fontFamily: fonts.montserratMedium,
    fontSize: 15,
    color: colors.text,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: colors.textLight,
    textDecorationLine: 'underline',
  },
});
