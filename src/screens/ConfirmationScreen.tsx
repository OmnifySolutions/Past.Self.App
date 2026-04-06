import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { getRepeatDescription } from '../utils/repeatUtils';
import { setOnboarded, hasSeenLoginPrompt, setLoginPromptSeen } from '../utils/storage';

// ─── Login Prompt Modal ───────────────────────────────────────────────────────
// Shown once, right after the first video save — peak emotional investment.
// Defined at module level: never re-mounts on parent state change.
//
// "Maybe later" dismisses permanently (marks seen). This is intentional —
// we never want to nag. One shot at the highest-value moment.
const LoginPromptModal = ({
  visible,
  onSignIn,
  onDismiss,
}: {
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <View style={lp.overlay}>
      <View style={lp.card}>
        {/* Icon */}
        <View style={lp.iconWrap}>
          <Ionicons name="cloud-upload-outline" size={28} color={colors.danger} />
        </View>

        {/* Copy */}
        <Text style={lp.title}>Don't lose this.</Text>
        <Text style={lp.body}>
          {"This message took courage to record. A free account keeps it safe — forever."}
        </Text>

        {/* Actions */}
        <TouchableOpacity style={lp.primaryBtn} onPress={onSignIn} activeOpacity={0.85}>
          <Text style={lp.primaryBtnText}>Create free account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={lp.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={lp.secondaryBtnText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

type Props = NativeStackScreenProps<RootStackParamList, 'Confirmation'>;

export function ConfirmationScreen({ route, navigation }: Props) {
  const { videoId, thumbnail, title, message, scheduledFor, repeat, appName, playOnce } = route.params;
  const insets = useSafeAreaInsets();
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(16)).current;
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentY,       { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    // Check once whether to show the login prompt.
    // Small delay so the confirmation content settles first — feels intentional, not jarring.
    const timer = setTimeout(async () => {
      const seen = await hasSeenLoginPrompt();
      if (!seen) setLoginPromptVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const formatTrigger = () => {
    if (appName) {
      return `Next time you open ${appName}${playOnce ? ' (once)' : ' (always)'}`;
    }
    if (scheduledFor) {
      const date = new Date(scheduledFor);
      if (repeat && repeat !== 'never') {
        return getRepeatDescription(date, repeat);
      }
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dateStr} at ${timeStr}`;
    }
    return '';
  };

  const dismissLoginPrompt = async () => {
    await setLoginPromptSeen();
    setLoginPromptVisible(false);
  };

  // Sign-in tapped: mark seen so we never show again, then navigate.
  // Replace this with real auth navigation once backend exists.
  const handleSignIn = async () => {
    await setLoginPromptSeen();
    setLoginPromptVisible(false);
    // TODO: navigate to auth screen when built
  };

  const handleDone = async () => {
    await setOnboarded();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.content, {
        opacity: contentOpacity,
        transform: [{ translateY: contentY }],
      }]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>

        <Text style={styles.title}>Message saved</Text>
        <Text style={styles.subtitle}>Your past self is ready to show up.</Text>

        <View style={styles.triggerCard}>
          <Ionicons
            name={appName ? 'phone-portrait-outline' : 'calendar-outline'}
            size={18} color={colors.danger}
          />
          <Text style={styles.triggerText}>{formatTrigger()}</Text>
        </View>

        {thumbnail ? (
          <View style={styles.thumbnailContainer}>
            <TouchableOpacity
              style={styles.thumbnail}
              onPress={() => navigation.navigate('Playback', { videoId, isTriggered: false })}
              activeOpacity={0.85}
            >
              <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.9)" />
              </View>
            </TouchableOpacity>
            <View style={styles.videoMeta}>
              <View style={styles.videoMetaLeft}>
                <Text style={styles.videoLabel}>{title}</Text>
                {message ? <Text style={styles.videoNote} numberOfLines={2}>{message}</Text> : null}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('Edit', { videoId })}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={14} color={colors.danger} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <LoginPromptModal
        visible={loginPromptVisible}
        onSignIn={handleSignIn}
        onDismiss={dismissLoginPrompt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.lg, gap: spacing.lg,
  },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#674454',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontFamily: fonts.montserratBold, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.inter, fontSize: 15, color: colors.textLight, textAlign: 'center' },
  triggerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.background,
    borderRadius: radius.lg, padding: spacing.md, width: '100%',
  },
  triggerText: {
    fontFamily: fonts.montserratMedium, fontSize: 14,
    color: colors.text, textAlign: 'center', flexShrink: 1,
  },
  thumbnailContainer: { width: '100%', gap: spacing.sm },
  thumbnail: {
    width: '100%', height: 180, borderRadius: radius.lg,
    backgroundColor: colors.accent, overflow: 'hidden',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  videoMeta:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  videoMetaLeft: { flex: 1 },
  videoLabel:    { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text },
  videoNote:     { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  editBtnText:  { fontFamily: fonts.montserratMedium, fontSize: 12, color: colors.danger },
  footer:       { padding: spacing.lg },
  doneBtn:      { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  doneBtnText:  { fontFamily: fonts.montserratBold, fontSize: 15, color: '#fff' },
});

// ─── Login prompt styles ───────────────────────────────────────────────────────
const lp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: '#fde5ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.montserratBold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.inter,
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    fontFamily: fonts.inter,
    fontSize: 14,
    color: colors.textLight,
  },
});
