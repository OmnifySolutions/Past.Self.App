import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { getVideos, updateVideo } from '../utils/storage';
import { ScheduledVideo } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Playback'>;

const SKIP_DELAY = 5;

function PlayerView({
  video,
  isTriggered,
  navigation,
}: {
  video: ScheduledVideo;
  isTriggered: boolean;
  navigation: Props['navigation'];
}) {
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [videoFinished, setVideoFinished] = useState(false);
  const [isMuted, setIsMuted]             = useState(false);   // session-only, no persistence
  const skipOpacity  = useRef(new Animated.Value(0)).current;
  const watchTimer   = useRef<NodeJS.Timeout | null>(null);

  const player = useVideoPlayer({ uri: video.videoUri }, p => {
    p.timeUpdateEventInterval = 0.5;
    p.play();
  });

  useEventListener(player, 'timeUpdate', (payload) => {
    const t = payload.currentTime ?? 0;
    const d = player.duration ?? 0;
    setCurrentTime(t);
    if (d > 0) setDuration(d);
    if (d > 0 && t >= d - 0.3) setVideoFinished(true);
  });

  useEventListener(player, 'playToEnd', () => {
    setVideoFinished(true);
  });

  useEffect(() => {
    if (!isTriggered) return;
    let elapsed = 0;
    watchTimer.current = setInterval(() => {
      elapsed += 1;
      if (elapsed >= SKIP_DELAY) {
        Animated.timing(skipOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
        if (watchTimer.current) clearInterval(watchTimer.current);
      }
    }, 1000);
    return () => { if (watchTimer.current) clearInterval(watchTimer.current); };
  }, [isTriggered]);

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    player.muted = next;
  };

  const handleDone = async () => {
    if (video.appTrigger?.playOnce && !video.appTrigger.hasPlayed) {
      await updateVideo(video.id, {
        appTrigger: { ...video.appTrigger, hasPlayed: true },
        isActive: false,
      });
    }
    navigation.goBack();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const showDoneButton = isTriggered ? videoFinished : true;
  const topOffset = insets.top + spacing.md;

  return (
    <View style={styles.container}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
      />

      {/* Volume toggle — top-left, always visible, Instagram-style */}
      <TouchableOpacity
        style={[styles.volumeBtn, { top: topOffset }]}
        onPress={handleMuteToggle}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-medium'}
          size={20}
          color="rgba(255,255,255,0.85)"
        />
      </TouchableOpacity>

      {/* Skip button — top-right, triggered mode only, appears after 5s */}
      {isTriggered && (
        <Animated.View
          style={[styles.skipBtn, { top: topOffset, opacity: skipOpacity }]}
        >
          <TouchableOpacity onPress={handleDone} activeOpacity={0.85} style={styles.skipTouchable}>
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="play-skip-forward" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        {showDoneButton && (
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function PlaybackScreen({ route, navigation }: Props) {
  const { videoId, isTriggered } = route.params;
  const triggered = isTriggered ?? false;
  const [video, setVideo] = useState<ScheduledVideo | null>(null);

  useEffect(() => {
    getVideos().then(videos => {
      const found = videos.find(v => v.id === videoId);
      if (found) setVideo(found);
    });
  }, [videoId]);

  if (!video) return <View style={styles.container} />;

  return (
    <PlayerView
      video={video}
      isTriggered={triggered}
      navigation={navigation}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Volume button: top-left, pill-shaped, matches skip button aesthetic
  volumeBtn: {
    position: 'absolute',
    left: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  skipBtn:       { position: 'absolute', right: spacing.lg },
  skipTouchable: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { fontFamily: fonts.inter, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.5)', gap: spacing.sm,
  },
  progressTrack: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full,
  },
  progressFill:  { height: '100%', backgroundColor: '#9898d6', borderRadius: radius.full },
  timeRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  timeText:      { fontFamily: fonts.inter, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  doneBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  doneBtnText: { fontFamily: fonts.montserratBold, fontSize: 15, color: '#fff' },
});
