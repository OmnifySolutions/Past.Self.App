import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, PanResponder, Animated,
  Platform, UIManager, LayoutAnimation, Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import { RootStackParamList } from '../../App';
import { getVideos, deleteVideo, saveVideos, updateVideo, checkScheduledVideos } from '../utils/storage';
import { ScheduledVideo } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';

import { getNextOccurrence, getRepeatDescription } from '../utils/repeatUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DELETE_ZONE_WIDTH = 72;
const CARD_HEIGHT = 112;

// ─── Clock SVG ────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56">
    <Circle cx={28} cy={28} r={24} fill="none" stroke={colors.danger} strokeWidth={2} />
    <Line x1={28} y1={28} x2={28} y2={14} stroke={colors.danger} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={28} y1={28} x2={38} y2={33} stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={28} cy={28} r={2.5} fill={colors.danger} />
  </Svg>
);

// ─── 6-dot drag handle icon ───────────────────────────────────────────────────
// Two columns of 3 dots — the universal drag handle pattern. Not intrusive.
const DragDots = () => (
  <Svg width={12} height={18} viewBox="0 0 12 18">
    <Circle cx={3}  cy={3}  r={1.5} fill={colors.textLight} />
    <Circle cx={9}  cy={3}  r={1.5} fill={colors.textLight} />
    <Circle cx={3}  cy={9}  r={1.5} fill={colors.textLight} />
    <Circle cx={9}  cy={9}  r={1.5} fill={colors.textLight} />
    <Circle cx={3}  cy={15} r={1.5} fill={colors.textLight} />
    <Circle cx={9}  cy={15} r={1.5} fill={colors.textLight} />
  </Svg>
);

// ─── iOS-style toggle ─────────────────────────────────────────────────────────
const AlarmToggle = ({ value, onValueChange }: { value: boolean; onValueChange: () => void }) => {
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;
  const prevValue  = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      Animated.spring(translateX, { toValue: value ? 22 : 2, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [value]);

  return (
    <TouchableOpacity onPress={onValueChange} activeOpacity={1} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={[s.toggleTrack, value ? s.toggleTrackOn : s.toggleTrackOff]}>
        <Animated.View style={[s.toggleThumb, { transform: [{ translateX }] }]} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Swipe-to-delete wrapper ──────────────────────────────────────────────────
const SWIPE_THRESHOLD = 52;

type SwipeableCardProps = {
  onDelete: () => void;
  freeze?: boolean;
  closeSignal?: number;
  children: React.ReactNode;
};

const SwipeableCard = ({ onDelete, freeze, closeSignal, children }: SwipeableCardProps) => {
  const currentX   = useRef(0);
  const offsetX    = useRef(0);
  const isOpen     = useRef(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const animation  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = translateX.addListener(({ value }) => { currentX.current = value; });
    return () => translateX.removeListener(id);
  }, []);

  const animateTo = useCallback((toValue: number, cb?: () => void) => {
    animation.current?.stop();
    animation.current = Animated.spring(translateX, { toValue, useNativeDriver: true, bounciness: 0, speed: 20 });
    animation.current.start(() => { offsetX.current = toValue; cb?.(); });
  }, []);

  const close = useCallback(() => { isOpen.current = false; offsetX.current = 0; animateTo(0); }, [animateTo]);
  const open  = useCallback(() => { isOpen.current = true; animateTo(-DELETE_ZONE_WIDTH); }, [animateTo]);

  useEffect(() => { if (closeSignal !== undefined && isOpen.current) close(); }, [closeSignal]);
  useEffect(() => {
    if (!freeze && isOpen.current) { const t = setTimeout(close, 200); return () => clearTimeout(t); }
  }, [freeze]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderGrant: () => {
        animation.current?.stop();
        translateX.setValue(currentX.current);
        offsetX.current = currentX.current;
      },
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.min(0, Math.max(-(DELETE_ZONE_WIDTH + 12), offsetX.current + g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        if (currentX.current < -SWIPE_THRESHOLD || g.vx < -0.5) open(); else close();
      },
      onPanResponderTerminate: () => close(),
    })
  ).current;

  return (
    <View style={s.swipeContainer}>
      <View style={s.deleteZone}>
        <TouchableOpacity style={s.deleteAction} onPress={() => { close(); onDelete(); }} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={s.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[s.swipeCard, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

// ─── Drag-to-reorder list ─────────────────────────────────────────────────────
//
// FIX: setState-in-render
// Previously: PanResponders were created lazily inside getPanResponder() called during render.
// React treats any side effect (including ref writes + state calls inside closures) that
// happens during the render pass as a violation. The error manifested as "Cannot update
// a component while rendering a different component."
//
// Fix: All PanResponders are created in a useEffect (after mount / when orderedIds changes),
// stored in panResponders ref. The render function only READS from this ref — no creation,
// no side effects during render.
//
// ANIMATIONS:
// - Grabbed card: scale 1.05 + shadow lift
// - Other cards: slide up/down via per-item translateY Animated.Value as dragged card passes
// - Target slot card: jiggle (±3px, 2 cycles) when dragged card first hovers over it
// - Release: spring snap back, LayoutAnimation for list reorder

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
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const dragY         = useRef(new Animated.Value(0)).current;
  const draggingId    = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const lastGestureY  = useRef(0);
  const lastHoverIdx  = useRef<number | null>(null);
  const orderedIdsRef = useRef(orderedIds);

  useEffect(() => { orderedIdsRef.current = orderedIds; }, [orderedIds]);

  // Per-item animated values — must exist before PanResponders are created
  const scaleAnims  = useRef<Record<string, Animated.Value>>({});
  const slideAnims  = useRef<Record<string, Animated.Value>>({});
  const jiggleAnims = useRef<Record<string, Animated.Value>>({});

  const ensureAnims = (id: string) => {
    if (!scaleAnims.current[id])  scaleAnims.current[id]  = new Animated.Value(1);
    if (!slideAnims.current[id])  slideAnims.current[id]  = new Animated.Value(0);
    if (!jiggleAnims.current[id]) jiggleAnims.current[id] = new Animated.Value(0);
  };

  orderedIds.forEach(ensureAnims);

  useEffect(() => {
    const incomingIds = items.map(i => i.id);
    const sameSet = incomingIds.length === orderedIds.length &&
      incomingIds.every(id => orderedIds.includes(id));
    if (!sameSet) setOrderedIds(incomingIds);
  }, [items]);

  const getById = (id: string) => items.find(i => i.id === id)!;

  const playJiggle = (id: string) => {
    const anim = jiggleAnims.current[id];
    if (!anim) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue:  3, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -3, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue:  2, duration: 35, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -2, duration: 35, useNativeDriver: true }),
      Animated.timing(anim, { toValue:  0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  const resetSlideAnims = () => {
    Object.values(slideAnims.current).forEach(anim => anim.setValue(0));
  };

  const updateSlideAnims = (fromIdx: number, toIdx: number) => {
    const ids = orderedIdsRef.current;
    ids.forEach((id, idx) => {
      if (!slideAnims.current[id]) return;
      let shift = 0;
      if (fromIdx < toIdx) {
        if (idx > fromIdx && idx <= toIdx) shift = -CARD_HEIGHT;
      } else {
        if (idx >= toIdx && idx < fromIdx) shift = CARD_HEIGHT;
      }
      Animated.spring(slideAnims.current[id], {
        toValue: shift,
        useNativeDriver: true,
        bounciness: 2,
        speed: 18,
      }).start();
    });
  };

  const finishDrag = (id: string, finalDy: number) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const ids  = orderedIdsRef.current;
    const from = ids.indexOf(id);
    const to   = Math.max(0, Math.min(ids.length - 1,
      from + Math.round(finalDy / CARD_HEIGHT)));

    Animated.spring(scaleAnims.current[id], {
      toValue: 1, useNativeDriver: true, bounciness: 6,
    }).start();

    dragY.setValue(0);
    draggingId.current   = null;
    lastHoverIdx.current = null;
    setActiveId(null);
    setHoverIndex(null);
    onScrollEnable(true);

    if (to !== from) {
      const next = [...ids];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      orderedIdsRef.current = next;
      resetSlideAnims();
      setOrderedIds(next);
      onReorder(next.map(id2 => items.find(i => i.id === id2)!).filter(Boolean));
    } else {
      resetSlideAnims();
    }
  };

  const panResponders = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});

  useEffect(() => {
    orderedIds.forEach(id => {
      panResponders.current[id] = PanResponder.create({
        onStartShouldSetPanResponder:        () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          if (isDraggingRef.current) return;
          isDraggingRef.current = true;
          draggingId.current    = id;
          lastGestureY.current  = 0;
          lastHoverIdx.current  = null;
          dragY.setValue(0);
          onScrollEnable(false);
          setActiveId(id);
          if (scaleAnims.current[id]) {
            Animated.spring(scaleAnims.current[id], {
              toValue: 1.05, useNativeDriver: true, bounciness: 8,
            }).start();
          }
        },
        onPanResponderMove: (_, g) => {
          if (!isDraggingRef.current) return;
          dragY.setValue(g.dy);
          lastGestureY.current = g.dy;

          const ids  = orderedIdsRef.current;
          const from = ids.indexOf(id);
          const to   = Math.max(0, Math.min(ids.length - 1,
            from + Math.round(g.dy / CARD_HEIGHT)));

          if (to !== lastHoverIdx.current) {
            lastHoverIdx.current = to;
            setHoverIndex(to);
            updateSlideAnims(from, to);
            if (to !== from && ids[to]) playJiggle(ids[to]);
          }
        },
        onPanResponderRelease: () => {
          if (!isDraggingRef.current || !draggingId.current) return;
          finishDrag(draggingId.current, lastGestureY.current);
        },
        onPanResponderTerminate: () => {
          if (!isDraggingRef.current || !draggingId.current) return;
          finishDrag(draggingId.current, lastGestureY.current);
        },
      });
    });
    Object.keys(panResponders.current).forEach(id => {
      if (!orderedIds.includes(id)) delete panResponders.current[id];
    });
  }, [orderedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View>
      {orderedIds.map((id) => {
        const item       = getById(id);
        if (!item) return null;
        const isDragging = activeId === id;
        const scaleAnim  = scaleAnims.current[id]  ?? new Animated.Value(1);
        const slideAnim  = slideAnims.current[id]  ?? new Animated.Value(0);
        const jiggleAnim = jiggleAnims.current[id] ?? new Animated.Value(0);
        const pr         = panResponders.current[id];

        return (
          <Animated.View
            key={id}
            style={[
              s.draggableRow,
              isDragging && s.draggableRowLifted,
              {
                transform: [
                  { translateY: isDragging ? dragY : slideAnim },
                  { scale: scaleAnim },
                  { translateX: isDragging ? 0 : jiggleAnim },
                ],
              },
            ]}
          >
            <View style={s.dragHandle} {...(pr ? pr.panHandlers : {})}>
              <DragDots />
            </View>
            <View style={s.draggableCardWrap}>
              {renderItem(item)}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

// ─── Upcoming card ────────────────────────────────────────────────────────────
const UpcomingCard = ({
  video, onEdit, onPlayback, onDelete, onTogglePaused,
}: {
  video: ScheduledVideo;
  onEdit: () => void;
  onPlayback: () => void;
  onDelete: () => void;
  onTogglePaused: () => void;
}) => {
  const date         = new Date(video.scheduledFor!);
  const hasRepeat    = video.repeat && video.repeat !== 'never';
  const isPaused     = !!video.isPaused;
  const triggerLabel = hasRepeat
    ? getRepeatDescription(date, video.repeat!)
    : date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const triggerIcon  = hasRepeat ? 'sync-outline' : 'calendar-outline';

  return (
    <TouchableOpacity style={s.upcomingCard} onPress={onEdit} activeOpacity={0.9}>
      <TouchableOpacity style={s.upcomingTrash} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>

      <TouchableOpacity style={s.upcomingThumb} onPress={onPlayback} activeOpacity={0.85}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}>
            <Ionicons name="videocam" size={36} color="#fff" />
          </View>
        )}
        <View style={s.playOverlayLarge}>
          <Ionicons name="play" size={40} color="#fff" />
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
        <AlarmToggle value={!isPaused} onValueChange={onTogglePaused} />
      </View>
    </TouchableOpacity>
  );
};

// ─── How It Works ─────────────────────────────────────────────────────────────
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
        <View style={s.stepCircle}><Text style={s.stepNum}>{step.n}</Text></View>
        <View style={s.stepTextBlock}>
          <Text style={s.stepTitle}>{step.title}</Text>
          <Text style={s.stepDesc}>{step.desc}</Text>
        </View>
      </View>
    ))}
  </View>
);

// ─── Settings Modal ───────────────────────────────────────────────────────────
// Defined at module level — never inline — to prevent remount on parent re-render.
// Uses Animated slide-down for dismiss. No backdrop tap-to-close (handle communicates that).
// No X button — the handle bar is the visual cue for swipe-to-dismiss.
type SettingsRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
};

const SHEET_HEIGHT = 520;

const SettingsModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  const rows: SettingsRow[] = [
    { icon: 'person-outline',             label: 'Account',       value: 'Sign in',     onPress: onClose },
    { icon: 'cloud-upload-outline',       label: 'Cloud backup',  value: 'Pro',         onPress: onClose },
    { icon: 'notifications-outline',      label: 'Notifications', value: 'On',          onPress: onClose },
    { icon: 'shield-outline',             label: 'App Guard',     value: 'Coming soon', onPress: onClose },
    { icon: 'star-outline',               label: 'Rate Past.Self.',                      onPress: () => { onClose(); Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID'); } },
    { icon: 'mail-outline',               label: 'Send feedback',                        onPress: () => { onClose(); Linking.openURL('mailto:hello@omnifysolutions.com?subject=Past.Self.%20Feedback'); } },
    { icon: 'information-circle-outline', label: 'About',         value: 'v1.0',        onPress: onClose },
    ...(__DEV__ ? [{
      icon: 'refresh-outline' as const,
      label: 'Reset app (dev)',
      destructive: true,
      onPress: async () => {
        const AS = require('@react-native-async-storage/async-storage').default;
        await AS.clear();
        onClose();
        const { DevSettings } = require('react-native');
        DevSettings.reload();
      },
    }] : []),
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop — separate animated view, tappable to close */}
      <Animated.View style={[sm.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet slides up from bottom */}
      <Animated.View style={[sm.sheet, { transform: [{ translateY }] }]}>
        <Text style={sm.title}>Settings</Text>

        {rows.map((row) => (
          <TouchableOpacity
            key={row.label}
            style={sm.row}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View style={sm.rowLeft}>
              <View style={[sm.iconWrap, row.destructive && sm.iconWrapDestructive]}>
                <Ionicons
                  name={row.icon}
                  size={18}
                  color="#fde5ea"
                />
              </View>
              <Text style={[sm.rowLabel, row.destructive && sm.rowLabelDestructive]}>
                {row.label}
              </Text>
            </View>
            <View style={sm.rowRight}>
              {row.value ? <Text style={sm.rowValue}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        ))}

        <Text style={sm.footer}>Past.Self. — made with intent.</Text>
      </Animated.View>
    </Modal>
  );
};

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos]               = useState<ScheduledVideo[]>([]);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [closeSignal, setCloseSignal]     = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getVideos().then(setVideos);
      checkScheduledVideos().then(triggered => {
        if (triggered) navigation.navigate('Playback', { videoId: triggered.id, isTriggered: true });
      });
    }, [navigation])
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
    const full    = upcomingVideo ? [upcomingVideo, ...newOrder, ...appVids] : [...newOrder, ...appVids];
    setVideos(full);
    await saveVideos(full);
  };

  const handleReorderApp = async (newOrder: ScheduledVideo[]) => {
    const full = [...videos.filter(v => !v.appTrigger), ...newOrder];
    setVideos(full);
    await saveVideos(full);
  };

  const renderDatetimeCard = useCallback((video: ScheduledVideo) => {
    const trigger      = formatDatetimeTrigger(video);
    const isPaused     = !!video.isPaused;
    const titleColor   = isPaused ? '#9ca3af' : colors.text;
    const messageColor = isPaused ? '#c4c4cc' : colors.textLight;
    const triggerColor = isPaused ? '#c4c4cc' : '#9898d6';

    return (
      <SwipeableCard onDelete={() => setDeleteId(video.id)} freeze={deleteId === video.id} closeSignal={closeSignal}>
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Edit', { videoId: video.id })} activeOpacity={1}>
          <TouchableOpacity style={s.thumbnail} onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })} activeOpacity={0.85}>
            {video.thumbnail
              ? <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}><Ionicons name="videocam" size={22} color="#fff" /></View>
            }
            {isPaused && <View style={s.pausedOverlay} />}
            <View style={s.durationBadge}><Text style={s.durationText}>{formatDuration(video.duration)}</Text></View>
            <View style={s.playOverlay}><Ionicons name="play" size={18} color={isPaused ? 'rgba(255,255,255,0.45)' : '#fff'} /></View>
          </TouchableOpacity>
          <View style={s.info}>
            <Text style={[s.cardTitle, { color: titleColor }]} numberOfLines={1}>{video.title}</Text>
            {video.message ? <Text style={[s.cardMessage, { color: messageColor }]} numberOfLines={2}>{video.message}</Text> : null}
            <View style={s.triggerRow}>
              <Ionicons name={trigger.icon} size={12} color={triggerColor} />
              <Text style={[s.triggerText, { color: triggerColor }]} numberOfLines={1}>{trigger.text}</Text>
            </View>
            {isPaused && <View style={s.pausedBadge}><Text style={s.pausedBadgeText}>Paused</Text></View>}
          </View>
          <View style={s.cardRight}>
            <AlarmToggle value={!isPaused} onValueChange={() => handleTogglePaused(video)} />
          </View>
        </TouchableOpacity>
      </SwipeableCard>
    );
  }, [videos, navigation, deleteId, closeSignal]);

  const renderAppCard = useCallback((video: ScheduledVideo) => {
    const isPaused     = !!video.isPaused;
    const hasPlayed    = !!video.appTrigger?.hasPlayed;
    const isPlayOnce   = !!video.appTrigger?.playOnce;
    const titleColor   = isPaused ? '#9ca3af' : colors.text;
    const messageColor = isPaused ? '#c4c4cc' : colors.textLight;
    const triggerColor = isPaused ? '#c4c4cc' : (hasPlayed ? colors.textLight : '#9898d6');

    return (
      <SwipeableCard onDelete={() => setDeleteId(video.id)} freeze={deleteId === video.id} closeSignal={closeSignal}>
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Edit', { videoId: video.id })} activeOpacity={1}>
          <TouchableOpacity style={s.thumbnail} onPress={() => navigation.navigate('Playback', { videoId: video.id, isTriggered: false })} activeOpacity={0.85}>
            {video.thumbnail
              ? <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, s.thumbnailPlaceholder]}><Ionicons name="videocam" size={22} color="#fff" /></View>
            }
            {isPaused && <View style={s.pausedOverlay} />}
            <View style={s.durationBadge}><Text style={s.durationText}>{formatDuration(video.duration)}</Text></View>
            <View style={s.playOverlay}><Ionicons name="play" size={18} color={isPaused ? 'rgba(255,255,255,0.45)' : '#fff'} /></View>
          </TouchableOpacity>
          <View style={s.info}>
            <Text style={[s.cardTitle, { color: titleColor }]} numberOfLines={1}>{video.title}</Text>
            {video.message ? <Text style={[s.cardMessage, { color: messageColor }]} numberOfLines={2}>{video.message}</Text> : null}
            <View style={s.triggerRow}>
              <Ionicons name="phone-portrait-outline" size={12} color={triggerColor} />
              <Text style={[s.triggerText, { color: triggerColor }]} numberOfLines={1}>
                {video.appTrigger?.appName} · {isPlayOnce ? 'Once' : 'Always'}
              </Text>
            </View>
            {isPaused && !isPlayOnce && <View style={s.pausedBadge}><Text style={s.pausedBadgeText}>Paused</Text></View>}
            {isPlayOnce && hasPlayed  && <View style={s.playedBadge}><Text style={s.playedBadgeText}>Played</Text></View>}
          </View>
          <View style={s.cardRight}>
            {!isPlayOnce && <AlarmToggle value={!isPaused} onValueChange={() => handleTogglePaused(video)} />}
          </View>
        </TouchableOpacity>
      </SwipeableCard>
    );
  }, [videos, navigation, deleteId, closeSignal]);

  const hasAnyVideos = videos.length > 0;

  return (
    <View style={[s.outerContainer, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.appName}>Past.Self.</Text>
          <Text style={s.tagline}>Messages from your past to your future</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
            style={s.gearBtn}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.recordBtn} onPress={() => navigation.navigate('Record', { prefill: undefined })} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.recordBtnText}>Record</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      {!hasAnyVideos ? (
        <View style={s.emptyOuter}>
          <View style={s.emptyInner}>
            <View style={s.emptyIcon}><ClockIcon /></View>
            <Text style={s.emptyTitle}>No videos yet</Text>
            <Text style={s.emptyBody}>{'Record your first message to your future self —\na reminder, a push, a promise.'}</Text>
            <TouchableOpacity style={s.emptyButton} onPress={() => navigation.navigate('Record', { prefill: undefined })} activeOpacity={0.85}>
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
          onScrollBeginDrag={() => setCloseSignal(n => n + 1)}
        >
          {upcomingVideo && (
            <View style={s.section}>
              <UpcomingCard
                video={upcomingVideo}
                onEdit={() => navigation.navigate('Edit', { videoId: upcomingVideo.id })}
                onPlayback={() => navigation.navigate('Playback', { videoId: upcomingVideo.id, isTriggered: false })}
                onDelete={() => setDeleteId(upcomingVideo.id)}
                onTogglePaused={() => handleTogglePaused(upcomingVideo)}
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
            <View style={s.modalIcon}><Ionicons name="trash-outline" size={22} color={colors.danger} /></View>
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
  headerLeft:  { flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gearBtn:     { padding: 4 },
  appName:     { fontFamily: fonts.brittany, fontSize: 36, color: colors.text },
  tagline:     { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight },
  recordBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  recordBtnText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },

  emptyOuter:      { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  emptyInner:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon:       { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle:      { fontFamily: fonts.montserratBold, fontSize: 20, color: colors.text, marginBottom: spacing.sm },
  emptyBody:       { fontFamily: fonts.inter, fontSize: 13, color: colors.text, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  emptyButton:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyButtonText: { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },

  scroll:        { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  section:       { marginBottom: spacing.md },
  sectionTitle:  { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: spacing.sm },

  upcomingCard:     { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#14273c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 14, elevation: 6, borderWidth: 1, borderColor: 'rgba(20,39,60,0.07)' },
  upcomingThumb:    { width: '100%', height: 160, backgroundColor: colors.accent },
  playOverlayLarge: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  upcomingBadge:    { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  upcomingDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9898d6' },
  upcomingBadgeText:{ fontFamily: fonts.montserratBold, fontSize: 11, color: '#fff' },
  upcomingTrash:    { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 10, padding: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.sm },
  upcomingInfo:     { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  upcomingInfoLeft: { flex: 1 },
  upcomingTitle:    { fontFamily: fonts.montserratBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  upcomingNote:     { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginBottom: 3 },

  swipeContainer: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.danger },
  swipeCard:      { backgroundColor: colors.card },
  deleteZone:      { position: 'absolute', top: 0, bottom: 0, right: 0, width: DELETE_ZONE_WIDTH, alignItems: 'center', justifyContent: 'center' },
  deleteAction:    { alignItems: 'center', gap: 3 },
  deleteActionText:{ fontFamily: fonts.montserratBold, fontSize: 11, color: '#fff' },

  draggableRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  draggableRowLifted: {
    zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  // Handle: tall enough touch target, horizontally compact
  dragHandle:        { paddingHorizontal: spacing.xs, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center' },
  draggableCardWrap: { flex: 1 },

  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.sm,
    alignItems: 'center', gap: spacing.sm,
    shadowColor: '#14273c', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(20,39,60,0.06)',
  },
  thumbnail:            { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.accent, overflow: 'hidden', flexShrink: 0 },
  thumbnailPlaceholder: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pausedOverlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
  playOverlay:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  durationBadge:        { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  durationText:         { color: '#fff', fontSize: 10, fontFamily: fonts.inter },

  info:        { flex: 1, minWidth: 0 },
  cardTitle:   { fontFamily: fonts.montserratBold, fontSize: 13, color: colors.text, marginBottom: 2 },
  cardMessage: { fontFamily: fonts.inter, fontSize: 11, color: colors.textLight, marginBottom: 4 },
  triggerRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggerText: { fontFamily: fonts.inter, fontSize: 11, flex: 1 },

  pausedBadge:     { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#9898d620', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pausedBadgeText: { fontFamily: fonts.montserratBold, fontSize: 10, color: '#9898d6' },
  playedBadge:     { alignSelf: 'flex-start', marginTop: 4, backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  playedBadgeText: { fontFamily: fonts.inter, fontSize: 10, color: colors.textLight },

  cardRight:     { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', paddingLeft: spacing.xs },
  toggleTrack:   { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleTrackOn: { backgroundColor: colors.danger },
  toggleTrackOff:{ backgroundColor: '#d1d5db' },
  toggleThumb:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },

  howItWorks:    { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg, alignSelf: 'center', width: '88%', shadowColor: '#14273c', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: 'rgba(20,39,60,0.06)' },
  howTitle:      { fontFamily: fonts.montserratBold, fontSize: 16, color: colors.text, marginBottom: spacing.lg },
  step:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  stepCircle:    { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, flexShrink: 0 },
  stepNum:       { fontFamily: fonts.montserratBold, fontSize: 14, color: '#fff' },
  stepTextBlock: { flex: 1 },
  stepTitle:     { fontFamily: fonts.montserratMedium, fontSize: 14, color: colors.text },
  stepDesc:      { fontFamily: fonts.inter, fontSize: 12, color: colors.textLight, marginTop: 2 },

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

// ─── Settings modal styles ─────────────────────────────────────────────────────
const sm = StyleSheet.create({
  // Backdrop: full-screen dim layer, animates independently from sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  // Sheet: pinned to bottom, slides up via translateY animation
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    paddingTop: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.montserratBold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconWrap: {
    width: 34, height: 34,
    borderRadius: 10,
    backgroundColor: '#9898d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDestructive: {
    backgroundColor: '#c0392b',
  },
  rowLabel: {
    fontFamily: fonts.interMedium,
    fontSize: 14,
    color: colors.text,
  },
  rowLabelDestructive: {
    color: colors.danger,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowValue: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: colors.textLight,
  },
  footer: {
    fontFamily: fonts.inter,
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.md,
    opacity: 0.6,
  },
});
