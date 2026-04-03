import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { getRepeatDescription } from '../utils/repeatUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirmation'>;

export function ConfirmationScreen({ route, navigation }: Props) {
  const { videoId, thumbnail, title, message, scheduledFor, repeat, appName, playOnce } = route.params;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
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

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, {
        opacity: contentOpacity,
        transform: [{ translateY: contentY }],
      }]}>
        {/* Success icon */}
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>

        <Text style={styles.title}>Message saved</Text>
        <Text style={styles.subtitle}>Your past self is ready to show up.</Text>

        {/* Trigger summary */}
        <View style={styles.triggerCard}>
          <Ionicons
            name={appName ? 'phone-portrait-outline' : 'calendar-outline'}
            size={18} color={colors.danger}
          />
          <Text style={styles.triggerText}>{formatTrigger()}</Text>
        </View>

        {/* Video thumbnail preview */}
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

      {/* Done button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.replace('Home')} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#674454',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.montserratBold, fontSize: 26, color: colors.text },
  subtitle: { fontFamily: fonts.inter, fontSize: 15, color: colors.textLight, textAlign: 'center' },
  triggerCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.lg,
    padding: spacing.md, width: '100%',
  },
  triggerText: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text, flex: 1 },
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
  videoMeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  videoMetaLeft: { flex: 1 },
  videoLabel: { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text },
  videoNote: { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  editBtnText: { fontFamily: fonts.montserratMedium, fontSize: 12, color: colors.danger },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl },
  doneBtn: { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  doneBtnText: { fontFamily: fonts.montserratBold, fontSize: 15, color: '#fff' },
});
