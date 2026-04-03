import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import { RootStackParamList } from '../../App';
import { getVideos, deleteVideo, saveVideos, updateVideo } from '../utils/storage';
import { ScheduledVideo } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';
import { getNextOccurrence, getRepeatDescription } from '../utils/repeatUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const ClockIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56">
    <Circle cx={28} cy={28} r={24} fill="none" stroke={colors.danger} strokeWidth={2} />
    <Line x1={28} y1={28} x2={28} y2={14} stroke={colors.danger} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={28} y1={28} x2={38} y2={33} stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={28} cy={28} r={2.5} fill={colors.danger} />
  </Svg>
);

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<ScheduledVideo[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { alertConfig, showAlert, hideAlert } = useBrandAlert();

  useFocusEffect(
    useCallback(() => {
      getVideos().then(setVideos);
    }, [])
  );

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteVideo(deleteId);
    setDeleteId(null);
    getVideos().then(setVideos);
  };

  const handleToggleActive = async (video: ScheduledVideo) => {
    await updateVideo(video.id, { isActive: !video.isActive });
    getVideos().then(setVideos);
  };

  const moveUp = async (index: number, list: ScheduledVideo[]) => {
    if (index === 0) return;
    const r = [...list];
    [r[index - 1], r[index]] = [r[index], r[index - 1]];
    const appVids = videos.filter(v => !!v.appTrigger);
    const full = [...r, ...appVids];
    setVideos(full);
    await saveVideos(full);
  };

  const moveDown = async (index: number, list: ScheduledVideo[]) => {
    if (index === list.length - 1) return;
    const r = [...list];
    [r[index + 1], r[index]] = [r[index], r[index + 1]];
    const appVids = videos.filter(v => !!v.appTrigger);
    const full = [...r, ...appVids];
    setVideos(full);
    await saveVideos(full);
  };

  const formatDatetimeTrigger = (video: ScheduledVideo) => {
    if (!video.scheduledFor) return { icon: 'time-outline' as const, text: '', isPast: false };
    const date = new Date(video.scheduledFor);
    const hasRepeat = video.repeat && video.repeat !== 'never';
    if (hasRepeat) {
      return { icon: 'sync-outline' as const, text: getRepeatDescription(date, video.repeat!), isPast: false };
    }
    const isPast = date < new Date();
    const dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { icon: 'calendar-outline' as const, text: isPast ? 'Played' : dateStr, isPast };
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const upcomingVideo = videos.find(v => {
    if (!v.isActive || !v.scheduledFor) return false;
    if (v.repeat && v.repeat !== 'never') return getNextOccurrence(v.scheduledFor, v.repeat) != null;
    return new Date(v.scheduledFor) > new Date();
  });

  const appTriggerVideos = videos.filter(v => !!v.appTrigger);
  const scheduledDatetimeVideos = videos.filter(
    v => v.id !== upcomingVideo?.id && !!v.scheduledFor && !v.appTrigger
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}><ClockIcon /></View>
      <Text style={styles.emptyTitle}>No videos yet</Text>
      <Text style={styles.emptyBody}>
        {'Record your first message to your future self —\na reminder, a push, a promise.'}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Record', { prefill: undefined })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );

  const UpcomingCard = ({ video }: { video: ScheduledVideo }) => {
    const date = new Date(video.scheduledFor!);
    const hasRepeat = video.repeat && video.repeat !== 'never';
    const triggerLabel = hasRepeat
      ? getRepeatDescription(date, video.repeat!)
      : date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const triggerIcon = hasRepeat ? 'sync-outline' : 'calendar-outline';

    return (
      <TouchableOpacity
        style={styles.upcomingCard}
        onPress={() => navigation.navigate('Edit', { videoId: video.id })}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          style={styles.upcomingThumb}
          onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })}
          activeOpacity={0.85}
        >
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbnailPlaceholder]}>
              <Ionicons name="videocam" size={36} color="#fff" />
            </View>
          )}
          <View style={styles.playOverlayLarge}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.upcomingBadge}>
            <View style={styles.upcomingDot} />
            <Text style={styles.upcomingBadgeText}>Upcoming</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.upcomingInfo}>
          <View style={styles.upcomingInfoLeft}>
            <Text style={styles.upcomingTitle} numberOfLines={1}>{video.title}</Text>
            {video.message ? <Text style={styles.upcomingNote} numberOfLines={1}>{video.message}</Text> : null}
            <View style={styles.triggerRow}>
              <Ionicons name={triggerIcon as any} size={13} color="#9898d6" />
              <Text style={[styles.triggerText, { color: '#9898d6' }]} numberOfLines={1}>{triggerLabel}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleToggleActive(video)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={video.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={24} color="#9898d6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteId(video.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const DatetimeCard = ({ video, index }: { video: ScheduledVideo; index: number }) => {
    const trigger = formatDatetimeTrigger(video);
    const isPaused = !video.isActive;
    return (
      <TouchableOpacity
        style={[styles.card, isPaused && styles.cardPaused]}
        onPress={() => navigation.navigate('Edit', { videoId: video.id })}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          style={styles.thumbnail}
          onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })}
          activeOpacity={0.85}
        >
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbnailPlaceholder]}>
              <Ionicons name="videocam" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={styles.cardTitle} numberOfLines={1}>{video.title}</Text>
          {video.message ? <Text style={styles.cardMessage} numberOfLines={2}>{video.message}</Text> : null}
          <View style={styles.triggerRow}>
            <Ionicons name={trigger.icon} size={13} color={trigger.isPast ? colors.textLight : colors.danger} />
            <Text style={[styles.triggerText, { color: trigger.isPast ? colors.textLight : colors.danger }]} numberOfLines={1}>
              {trigger.text}
            </Text>
          </View>
          {isPaused && <View style={styles.pausedBadge}><Text style={styles.pausedBadgeText}>Paused</Text></View>}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleToggleActive(video)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={video.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={26} color="#9898d6" />
          </TouchableOpacity>
          <View style={styles.reorderBtns}>
            <TouchableOpacity onPress={() => moveUp(index, scheduledDatetimeVideos)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.border : colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => moveDown(index, scheduledDatetimeVideos)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="chevron-down" size={16} color={index === scheduledDatetimeVideos.length - 1 ? colors.border : colors.accent} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setDeleteId(video.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const AppCard = ({ video }: { video: ScheduledVideo }) => {
    const isPaused = !video.isActive;
    const hasPlayed = video.appTrigger?.hasPlayed;
    const isPlayOnce = video.appTrigger?.playOnce;
    return (
      <TouchableOpacity
        style={[styles.card, isPaused && styles.cardPaused]}
        onPress={() => navigation.navigate('Edit', { videoId: video.id })}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          style={styles.thumbnail}
          onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })}
          activeOpacity={0.85}
        >
          {video.thumbnail ? (
            <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbnailPlaceholder]}>
              <Ionicons name="videocam" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={styles.cardTitle} numberOfLines={1}>{video.title}</Text>
          {video.message ? <Text style={styles.cardMessage} numberOfLines={2}>{video.message}</Text> : null}
          <View style={styles.triggerRow}>
            <Ionicons name="phone-portrait-outline" size={13} color={hasPlayed ? colors.textLight : colors.danger} />
            <Text style={[styles.triggerText, { color: hasPlayed ? colors.textLight : colors.danger }]} numberOfLines={1}>
              {video.appTrigger?.appName} · {isPlayOnce ? 'Once' : 'Always'}
            </Text>
          </View>
          {isPaused && <View style={styles.pausedBadge}><Text style={styles.pausedBadgeText}>Paused</Text></View>}
          {hasPlayed && <View style={styles.badge}><Text style={styles.badgeText}>Played</Text></View>}
        </View>
        <View style={styles.actions}>
          {!isPlayOnce && (
            <TouchableOpacity onPress={() => handleToggleActive(video)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={video.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={26} color="#9898d6" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setDeleteId(video.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // How It Works — fixed-height rows so circle numbers are perfectly equidistant
  const HOW_STEPS = [
    { n: '1', title: 'Record your video', desc: 'Capture a motivational message for your future self' },
    { n: '2', title: 'Set when to play', desc: 'Choose a date/time or link it to an app opening' },
    { n: '3', title: 'Get motivated', desc: 'Your video plays automatically at the right moment' },
  ];

  const HowItWorks = () => (
    <View style={styles.howItWorks}>
      <Text style={styles.howTitle}>How it works</Text>
      {HOW_STEPS.map(step => (
        <View key={step.n} style={styles.step}>
          <View style={styles.stepLeft}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>{step.n}</Text>
            </View>
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const hasAnyVideos = videos.length > 0;

  return (
    <View style={[styles.outerContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Past.Self.</Text>
          <Text style={styles.tagline}>Messages from your past to your future</Text>
        </View>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={() => navigation.navigate('Record', { prefill: undefined })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.recordBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasAnyVideos && renderEmpty()}

        {upcomingVideo && (
          <View style={styles.section}>
            <UpcomingCard video={upcomingVideo} />
          </View>
        )}

        {scheduledDatetimeVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            {scheduledDatetimeVideos.map((item, index) => (
              <DatetimeCard key={item.id} video={item} index={index} />
            ))}
          </View>
        )}

        {appTriggerVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Triggers</Text>
            {appTriggerVideos.map(item => (
              <AppCard key={item.id} video={item} />
            ))}
          </View>
        )}

        <HowItWorks />
      </ScrollView>

      {deleteId && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete this video?</Text>
            <Text style={styles.modalBody}>This message from your past self will be permanently removed.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteId(null)} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete} activeOpacity={0.85}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <BrandAlert {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  appName: { fontFamily: fonts.brittany, fontSize: 36, color: colors.text },
  tagline: { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.danger, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  recordBtnText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: spacing.sm },
  upcomingCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    borderWidth: 1.5, borderColor: '#9898d620',
  },
  upcomingThumb: { width: '100%', height: 160, backgroundColor: colors.accent },
  playOverlayLarge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  upcomingBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  upcomingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9898d6' },
  upcomingBadgeText: { fontFamily: fonts.montserratBold, fontSize: 11, color: '#fff' },
  upcomingInfo: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm,
  },
  upcomingInfoLeft: { flex: 1 },
  upcomingTitle: { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  upcomingNote: { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginBottom: 3 },
  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.sm,
    alignItems: 'center', gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    marginBottom: spacing.sm,
  },
  cardPaused: { opacity: 0.6 },
  thumbnail: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.accent, overflow: 'hidden' },
  thumbnailPlaceholder: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)',
  },
  durationBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 10, fontFamily: fonts.inter },
  info: { flex: 1 },
  cardTitle: { fontFamily: fonts.montserratBold, fontSize: 13, color: colors.text, marginBottom: 3 },
  cardMessage: { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginBottom: 5 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggerText: { fontFamily: fonts.inter, fontSize: 11, flex: 1 },
  pausedBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: '#9898d620', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  pausedBadgeText: { fontFamily: fonts.montserratBold, fontSize: 10, color: '#9898d6' },
  badge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.inter, fontSize: 10, color: colors.textLight },
  actions: { alignItems: 'center', gap: spacing.sm },
  reorderBtns: { alignItems: 'center', gap: 2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 420 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.montserratBold, fontSize: 20, color: colors.text, marginBottom: spacing.sm },
  emptyBody: { fontFamily: fonts.inter, fontSize: 13, color: colors.text, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyButtonText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },

  // How It Works — fixed height rows, circles always equidistant
  howItWorks: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.md,
  },
  howTitle: {
    fontFamily: fonts.montserratBold, fontSize: 16, color: colors.text,
    marginBottom: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',      // vertically center circle with text
    minHeight: 56,             // fixed row height = circles always same distance apart
    marginBottom: spacing.md,
  },
  stepLeft: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  stepText: { flex: 1, paddingLeft: spacing.sm },
  stepTitle: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  stepDesc: { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginTop: 2 },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg, zIndex: 100,
  },
  modal: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 320 },
  modalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.montserratBold, fontSize: 17, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  modalBody: { fontFamily: fonts.inter, fontSize: 13, color: colors.textLight, textAlign: 'center', marginBottom: spacing.lg },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center' },
  cancelText: { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  deleteConfirmBtn: { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, backgroundColor: colors.danger, alignItems: 'center' },
  deleteConfirmText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
});
