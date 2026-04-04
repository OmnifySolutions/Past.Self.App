import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, PanResponder, Animated,
  Platform, UIManager, LayoutAnimation,
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DELETE_ZONE_WIDTH = 72;
const CARD_HEIGHT = 104; // card height + marginBottom — adjust if card size changes

// ─── Clock SVG ────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56">
    <Circle cx={28} cy={28} r={24} fill="none" stroke={colors.danger} strokeWidth={2} />
    <Line x1={28} y1={28} x2={28} y2={14} stroke={colors.danger} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={28} y1={28} x2={38} y2={33} stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={28} cy={28} r={2.5} fill={colors.danger} />
  </Svg>
);

// ─── iOS-style toggle ─────────────────────────────────────────────────────────
// Defined outside HomeScreen so React never treats it as a new component type
// on re-render — which was causing the UpcomingCard thumbnail to flicker.
const AlarmToggle = ({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: () => void;
}) => {
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;
  const prevValue  = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      Animated.spring(translateX, {
        toValue: value ? 22 : 2,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [value]);

  return (
    <TouchableOpacity
      onPress={onValueChange}
      activeOpacity={0.85}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[s.toggleTrack, value ? s.toggleTrackOn : s.toggleTrackOff]}>
        <Animated.View style={[s.toggleThumb, { transform: [{ translateX }] }]} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Swipe-to-delete wrapper ──────────────────────────────────────────────────
const SWIPE_THRESHOLD = 60;

const SwipeableCard = ({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen     = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    isOpen.current = false;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        translateX.setOffset(isOpen.current ? -DELETE_ZONE_WIDTH : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const clamped = Math.min(0, Math.max(-(DELETE_ZONE_WIDTH + 16), g.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const raw = (translateX as any)._value as number;
        if (raw < -SWIPE_THRESHOLD || g.vx < -0.6) {
          Animated.spring(translateX, { toValue: -DELETE_ZONE_WIDTH, useNativeDriver: true, bounciness: 0 }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          isOpen.current = false;
        }
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        isOpen.current = false;
      },
    })
  ).current;

  return (
    <View style={s.swipeContainer}>
      <View style={s.deleteZone}>
        <TouchableOpacity
          style={s.deleteAction}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={s.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

// ─── Drag-to-reorder list ─────────────────────────────────────────────────────
// The fix for twitching: use a stable `order` state array (IDs only).
// During drag, we only move the dragged card visually (translateY on the Animated.View).
// We commit the new order to state only on release — no mid-drag state mutations.
const DraggableList = ({
  items,
  onScrollEnable,
  renderItem,
  onReorder,
}: {
  items: ScheduledVideo[];
  onScrollEnable: (v: boolean) => void;
  renderItem: (item: ScheduledVideo) => React.ReactNode;
  onReorder: (newOrder: ScheduledVideo[]) => void;
}) => {
  const [orderedIds, setOrderedIds] = useState(() => items.map(i => i.id));
  const dragY        = useRef(new Animated.Value(0)).current;
  const draggingIdx  = useRef<number | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Sync IDs when items are added or removed externally (not from reorder)
  useEffect(() => {
    const incomingIds = items.map(i => i.id);
    const sameSet =
      incomingIds.length === orderedIds.length &&
      incomingIds.every(id => orderedIds.includes(id));
    if (!sameSet) setOrderedIds(incomingIds);
  }, [items]);

  const getById = (id: string) => items.find(i => i.id === id)!;

  const makeHandlers = (index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderGrant: () => {
        draggingIdx.current = index;
        dragY.setValue(0);
        setActiveIdx(index);
        onScrollEnable(false);
      },
      onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        const from  = draggingIdx.current!;
        const delta = Math.round(g.dy / CARD_HEIGHT);
        const to    = Math.max(0, Math.min(orderedIds.length - 1, from + delta));

        dragY.setValue(0);
        draggingIdx.current = null;
        setActiveIdx(null);
        onScrollEnable(true);

        if (to !== from) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const next = [...orderedIds];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          setOrderedIds(next);
          onReorder(next.map(getById).filter(Boolean));
        }
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        draggingIdx.current = null;
        setActiveIdx(null);
        onScrollEnable(true);
      },
    }).panHandlers;

  return (
    <View>
      {orderedIds.map((id, index) => {
        const item      = getById(id);
        if (!item) return null;
        const isDragging = activeIdx === index;
        const handlers   = makeHandlers(index);

        return (
          <Animated.View
            key={id}
            style={isDragging && {
              transform: [{ translateY: dragY }],
              zIndex: 999,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View style={s.draggableRow}>
              {/* Only the handle area captures the vertical pan */}
              <View style={s.dragHandleArea} {...handlers}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={16}
                  color={item.isPaused ? colors.border : colors.textLight}
                />
              </View>
              <View style={s.draggableContent}>
                {renderItem(item)}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

// ─── Upcoming card — defined outside HomeScreen to prevent remount flicker ────
const UpcomingCard = ({
  video,
  onEdit,
  onPlayback,
  onDelete,
}: {
  video: ScheduledVideo;
  onEdit: () => void;
  onPlayback: () => void;
  onDelete: () => void;
}) => {
  const date        = new Date(video.scheduledFor!);
  const hasRepeat   = video.repeat && video.repeat !== 'never';
  const triggerLabel = hasRepeat
    ? getRepeatDescription(date, video.repeat!)
    : date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const triggerIcon = hasRepeat ? 'sync-outline' : 'calendar-outline';

  return (
    <TouchableOpacity style={s.upcomingCard} onPress={onEdit} activeOpacity={0.9}>
      <TouchableOpacity style={s.upcomingThumb} onPress={onPlayback} activeOpacity={0.85}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}>
            <Ionicons name="videocam" size={36} color="#fff" />
          </View>
        )}
        <View style={s.playOverlayLarge}>
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={s.upcomingBadge}>
          <View style={s.upcomingDot} />
          <Text style={s.upcomingBadgeText}>Upcoming</Text>
        </View>
      </TouchableOpacity>
      <View style={s.upcomingInfo}>
        <View style={s.upcomingInfoLeft}>
          <Text style={s.upcomingTitle} numberOfLines={1}>{video.title}</Text>
          {video.message ? <Text style={s.upcomingNote} numberOfLines={1}>{video.message}</Text> : null}
          <View style={s.triggerRow}>
            <Ionicons name={triggerIcon as any} size={13} color="#9898d6" />
            <Text style={[s.triggerText, { color: '#9898d6' }]} numberOfLines={1}>{triggerLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── How It Works — static, defined outside ───────────────────────────────────
const HOW_STEPS = [
  { n: '1', title: 'Record your video', desc: 'Capture a motivational message for your future self' },
  { n: '2', title: 'Set when to play',  desc: 'Choose a date/time or link it to an app opening' },
  { n: '3', title: 'Get motivated',     desc: 'Your video plays automatically at the right moment' },
];
const HowItWorks = () => (
  <View style={s.howItWorks}>
    <Text style={s.howTitle}>How it works</Text>
    {HOW_STEPS.map(step => (
      <View key={step.n} style={s.step}>
        <View style={s.stepCircle}>
          <Text style={s.stepNum}>{step.n}</Text>
        </View>
        <View style={s.stepTextBlock}>
          <Text style={s.stepTitle}>{step.title}</Text>
          <Text style={s.stepDesc}>{step.desc}</Text>
        </View>
      </View>
    ))}
  </View>
);

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos]             = useState<ScheduledVideo[]>([]);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const { alertConfig, showAlert, hideAlert } = useBrandAlert();

  useFocusEffect(
    useCallback(() => { getVideos().then(setVideos); }, [])
  );

  const reload = () => getVideos().then(setVideos);

  const confirmDelete = async () => {
    if (!deleteId) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await deleteVideo(deleteId);
    setDeleteId(null);
    reload();
  };

  const handleTogglePaused = async (video: ScheduledVideo) => {
    await updateVideo(video.id, { isPaused: !video.isPaused });
    reload();
  };

  const formatDatetimeTrigger = (video: ScheduledVideo) => {
    if (!video.scheduledFor) return { icon: 'time-outline' as const, text: '', isPast: false };
    const date = new Date(video.scheduledFor);
    const hasRepeat = video.repeat && video.repeat !== 'never';
    if (hasRepeat) return { icon: 'sync-outline' as const, text: getRepeatDescription(date, video.repeat!), isPast: false };
    const isPast = date < new Date();
    const dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { icon: 'calendar-outline' as const, text: isPast ? 'Played' : dateStr, isPast };
  };

  const formatDuration = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

  const upcomingVideo = videos.find(v => {
    if (!v.isActive || v.isPaused || !v.scheduledFor) return false;
    if (v.repeat && v.repeat !== 'never') return getNextOccurrence(v.scheduledFor, v.repeat) != null;
    return new Date(v.scheduledFor) > new Date();
  });

  const appTriggerVideos        = videos.filter(v => !!v.appTrigger);
  const scheduledDatetimeVideos = videos.filter(
    v => v.id !== upcomingVideo?.id && !!v.scheduledFor && !v.appTrigger
  );

  const handleReorderScheduled = async (newOrder: ScheduledVideo[]) => {
    const appVids = videos.filter(v => !!v.appTrigger);
    const full    = upcomingVideo
      ? [upcomingVideo, ...newOrder, ...appVids]
      : [...newOrder, ...appVids];
    setVideos(full);
    await saveVideos(full);
  };

  const handleReorderApp = async (newOrder: ScheduledVideo[]) => {
    const datetimeVids = videos.filter(v => !v.appTrigger);
    const full = [...datetimeVids, ...newOrder];
    setVideos(full);
    await saveVideos(full);
  };

  // ── Datetime card renderer ───────────────────────────────────────────────────
  const renderDatetimeCard = useCallback((video: ScheduledVideo) => {
    const trigger  = formatDatetimeTrigger(video);
    const isPaused = !!video.isPaused;
    return (
      <SwipeableCard onDelete={() => setDeleteId(video.id)}>
        <TouchableOpacity
          style={[s.card, isPaused && s.cardPaused]}
          onPress={() => navigation.navigate('Edit', { videoId: video.id })}
          activeOpacity={0.9}
        >
          <TouchableOpacity
            style={s.thumbnail}
            onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })}
            activeOpacity={0.85}
          >
            {video.thumbnail ? (
              <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}>
                <Ionicons name="videocam" size={22} color="#fff" />
              </View>
            )}
            {isPaused && <View style={s.pausedOverlay} />}
            <View style={s.durationBadge}>
              <Text style={s.durationText}>{formatDuration(video.duration)}</Text>
            </View>
            <View style={s.playOverlay}>
              <Ionicons name="play" size={18} color={isPaused ? 'rgba(255,255,255,0.45)' : '#fff'} />
            </View>
          </TouchableOpacity>

          <View style={s.info}>
            <Text style={[s.cardTitle, isPaused && s.textMuted]} numberOfLines={1}>{video.title}</Text>
            {video.message
              ? <Text style={[s.cardMessage, isPaused && s.textMuted]} numberOfLines={2}>{video.message}</Text>
              : null}
            <View style={s.triggerRow}>
              <Ionicons
                name={trigger.icon} size={12}
                color={isPaused ? colors.border : (trigger.isPast ? colors.textLight : colors.danger)}
              />
              <Text
                style={[s.triggerText, { color: isPaused ? colors.border : (trigger.isPast ? colors.textLight : colors.danger) }]}
                numberOfLines={1}
              >
                {trigger.text}
              </Text>
            </View>
          </View>

          <View style={s.cardRight}>
            <AlarmToggle value={!isPaused} onValueChange={() => handleTogglePaused(video)} />
          </View>
        </TouchableOpacity>
      </SwipeableCard>
    );
  }, [videos, navigation]);

  // ── App trigger card renderer ────────────────────────────────────────────────
  const renderAppCard = useCallback((video: ScheduledVideo) => {
    const isPaused   = !!video.isPaused;
    const hasPlayed  = !!video.appTrigger?.hasPlayed;
    const isPlayOnce = !!video.appTrigger?.playOnce;

    return (
      <SwipeableCard onDelete={() => setDeleteId(video.id)}>
        <TouchableOpacity
          style={[s.card, isPaused && s.cardPaused]}
          onPress={() => navigation.navigate('Edit', { videoId: video.id })}
          activeOpacity={0.9}
        >
          <TouchableOpacity
            style={s.thumbnail}
            onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })}
            activeOpacity={0.85}
          >
            {video.thumbnail ? (
              <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}>
                <Ionicons name="videocam" size={22} color="#fff" />
              </View>
            )}
            {isPaused && <View style={s.pausedOverlay} />}
            <View style={s.durationBadge}>
              <Text style={s.durationText}>{formatDuration(video.duration)}</Text>
            </View>
            <View style={s.playOverlay}>
              <Ionicons name="play" size={18} color={isPaused ? 'rgba(255,255,255,0.45)' : '#fff'} />
            </View>
          </TouchableOpacity>

          <View style={s.info}>
            <Text style={[s.cardTitle, isPaused && s.textMuted]} numberOfLines={1}>{video.title}</Text>
            {video.message
              ? <Text style={[s.cardMessage, isPaused && s.textMuted]} numberOfLines={2}>{video.message}</Text>
              : null}
            <View style={s.triggerRow}>
              <Ionicons
                name="phone-portrait-outline" size={12}
                color={isPaused ? colors.border : (hasPlayed ? colors.textLight : colors.danger)}
              />
              <Text
                style={[s.triggerText, { color: isPaused ? colors.border : (hasPlayed ? colors.textLight : colors.danger) }]}
                numberOfLines={1}
              >
                {video.appTrigger?.appName} · {isPlayOnce ? 'Once' : 'Always'}
              </Text>
            </View>
            {isPaused && !isPlayOnce && (
              <View style={s.pausedBadge}><Text style={s.pausedBadgeText}>Paused</Text></View>
            )}
            {isPlayOnce && hasPlayed && (
              <View style={s.playedBadge}><Text style={s.playedBadgeText}>Played</Text></View>
            )}
          </View>

          <View style={s.cardRight}>
            {!isPlayOnce && (
              <AlarmToggle value={!isPaused} onValueChange={() => handleTogglePaused(video)} />
            )}
          </View>
        </TouchableOpacity>
      </SwipeableCard>
    );
  }, [videos, navigation]);

  const hasAnyVideos = videos.length > 0;

  return (
    <View style={[s.outerContainer, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.appName}>Past.Self.</Text>
          <Text style={s.tagline}>Messages from your past to your future</Text>
        </View>
        <TouchableOpacity
          style={s.recordBtn}
          onPress={() => navigation.navigate('Record', { prefill: undefined })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.recordBtnText}>Record</Text>
        </TouchableOpacity>
      </View>

      {!hasAnyVideos ? (
        // Empty: fills screen, no scroll, HowItWorks visible below button
        <View style={s.emptyOuter}>
          <View style={s.emptyInner}>
            <View style={s.emptyIcon}><ClockIcon /></View>
            <Text style={s.emptyTitle}>No videos yet</Text>
            <Text style={s.emptyBody}>
              {'Record your first message to your future self —\na reminder, a push, a promise.'}
            </Text>
            <TouchableOpacity
              style={s.emptyButton}
              onPress={() => navigation.navigate('Record', { prefill: undefined })}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={s.emptyButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
          <HowItWorks />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {upcomingVideo && (
            <View style={s.section}>
              <UpcomingCard
                video={upcomingVideo}
                onEdit={() => navigation.navigate('Edit', { videoId: upcomingVideo.id })}
                onPlayback={() => navigation.navigate('Playback', { videoId: upcomingVideo.id, isTriggered: false })}
                onDelete={() => setDeleteId(upcomingVideo.id)}
              />
            </View>
          )}

          {scheduledDatetimeVideos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Scheduled</Text>
              <DraggableList
                items={scheduledDatetimeVideos}
                onScrollEnable={setScrollEnabled}
                renderItem={renderDatetimeCard}
                onReorder={handleReorderScheduled}
              />
            </View>
          )}

          {appTriggerVideos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>App Triggers</Text>
              <DraggableList
                items={appTriggerVideos}
                onScrollEnable={setScrollEnabled}
                renderItem={renderAppCard}
                onReorder={handleReorderApp}
              />
            </View>
          )}

          <HowItWorks />
        </ScrollView>
      )}

      {deleteId && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalIcon}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </View>
            <Text style={s.modalTitle}>Delete this video?</Text>
            <Text style={s.modalBody}>This message from your past self will be permanently removed.</Text>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setDeleteId(null)} activeOpacity={0.85}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteConfirmBtn} onPress={confirmDelete} activeOpacity={0.85}>
                <Text style={s.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <BrandAlert {...alertConfig} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: colors.card },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  appName:       { fontFamily: fonts.brittany, fontSize: 36, color: colors.text },
  tagline:       { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight },
  recordBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.danger, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  recordBtnText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },

  // Empty state
  emptyOuter:  { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  emptyInner:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:   {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyTitle:      { fontFamily: fonts.montserratBold, fontSize: 20, color: colors.text, marginBottom: spacing.sm },
  emptyBody:       { fontFamily: fonts.inter, fontSize: 13, color: colors.text, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  emptyButton:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyButtonText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },

  scroll:        { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  section:       { marginBottom: spacing.md },
  sectionTitle:  { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: spacing.sm },

  // Upcoming card
  upcomingCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    borderWidth: 1.5, borderColor: '#9898d620',
  },
  upcomingThumb:    { width: '100%', height: 160, backgroundColor: colors.accent },
  playOverlayLarge: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  upcomingBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  upcomingDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9898d6' },
  upcomingBadgeText: { fontFamily: fonts.montserratBold, fontSize: 11, color: '#fff' },
  upcomingInfo:      { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  upcomingInfoLeft:  { flex: 1 },
  upcomingTitle:     { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  upcomingNote:      { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginBottom: 3 },

  // Swipe-to-delete
  swipeContainer: {
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.sm,
  },
  deleteZone:      { position: 'absolute', top: 0, bottom: 0, right: 0, width: DELETE_ZONE_WIDTH, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteAction:    { alignItems: 'center', gap: 3 },
  deleteActionText:{ fontFamily: fonts.montserratBold, fontSize: 11, color: '#fff' },

  // Draggable row
  draggableRow:    { flexDirection: 'row', alignItems: 'center' },
  dragHandleArea:  { paddingHorizontal: spacing.xs, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  draggableContent:{ flex: 1 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.sm,
    alignItems: 'center', gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardPaused: { opacity: 0.38 },

  thumbnail:           { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.accent, overflow: 'hidden', flexShrink: 0 },
  thumbnailPlaceholder:{ backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pausedOverlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)' },
  playOverlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  durationBadge:       { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  durationText:        { color: '#fff', fontSize: 10, fontFamily: fonts.inter },

  info:       { flex: 1, minWidth: 0 },
  cardTitle:  { fontFamily: fonts.montserratBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  cardMessage:{ fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginBottom: 4 },
  textMuted:  { color: colors.textLight },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggerText:{ fontFamily: fonts.inter, fontSize: 11, flex: 1 },

  pausedBadge:     { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#9898d620', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pausedBadgeText: { fontFamily: fonts.montserratBold, fontSize: 10, color: '#9898d6' },
  playedBadge:     { alignSelf: 'flex-start', marginTop: 4, backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  playedBadgeText: { fontFamily: fonts.inter, fontSize: 10, color: colors.textLight },

  // Toggle column — vertically centred in card
  cardRight: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', paddingLeft: spacing.xs },

  // Toggle
  toggleTrack:    { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleTrackOn:  { backgroundColor: colors.danger },
  toggleTrackOff: { backgroundColor: '#d1d5db' },
  toggleThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },

  // How it works — FIX: flex:1 on text block so it never clips
  howItWorks:  { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  howTitle:    { fontFamily: fonts.montserratBold, fontSize: 16, color: colors.text, marginBottom: spacing.lg },
  step:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  stepCircle:  { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, flexShrink: 0 },
  stepNum:     { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  stepTextBlock: { flex: 1 },
  stepTitle:   { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  stepDesc:    { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginTop: 2 },

  // Delete modal
  modalOverlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, zIndex: 100 },
  modal:             { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, width: '100%', maxWidth: 320 },
  modalIcon:         { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  modalTitle:        { fontFamily: fonts.montserratBold, fontSize: 17, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  modalBody:         { fontFamily: fonts.inter, fontSize: 13, color: colors.textLight, textAlign: 'center', marginBottom: spacing.lg },
  modalButtons:      { flexDirection: 'row', gap: spacing.sm },
  cancelBtn:         { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center' },
  cancelText:        { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  deleteConfirmBtn:  { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, backgroundColor: colors.danger, alignItems: 'center' },
  deleteConfirmText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
});
