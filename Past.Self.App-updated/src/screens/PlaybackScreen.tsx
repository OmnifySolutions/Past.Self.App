import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { getVideos, updateVideo } from '../utils/storage';
import { ScheduledVideo } from '../types/video';
import { colors, fonts, spacing, radius } from '../styles/theme';
import { BrandAlert, useBrandAlert } from '../components/BrandAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'Playback'>;

const SKIP_DELAY = 5;

export function PlaybackScreen({ route, navigation }: Props) {
  const { videoId, isTriggered } = route.params;
  const insets = useSafeAreaInsets();
  const [video, setVideo] = useState<ScheduledVideo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoFinished, setVideoFinished] = useState(false);
  const skipOpacity = useRef(new Animated.Value(0)).current;
  const watchTimer = useRef<NodeJS.Timeout | null>(null);
  const { alertConfig } = useBrandAlert();
  const playerRef = useRef<any>(null);
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => {
    getVideos().then(videos => {
      const found = videos.find(v => v.id === videoId);
      if (found) {
        setVideo(found);
        // Create player for this video
        const newPlayer = useVideoPlayer(found.videoUri, playerEvents => {
          playerEvents.addListener('statusUpdate', updateStatus);
        });
        playerRef.current = newPlayer;
        setPlayer(newPlayer);
      }
    });

    watchTimer.current = setInterval(() => {
      setCurrentTime(t => {
        const next = t + 1;
        if (next >= SKIP_DELAY) {
          Animated.timing(skipOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          if (watchTimer.current) clearInterval(watchTimer.current);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (watchTimer.current) clearInterval(watchTimer.current);
      if (playerRef.current) {
        playerRef.current.release();
      }
    };
  }, [videoId]);

  const updateStatus = (status: any) => {
    if (status.duration) setDuration(status.duration);
    if (status.currentTime !== undefined) setCurrentTime(status.currentTime);

    // Check if video finished (within 100ms of duration)
    if (
      status.currentTime &&
      status.duration &&
      status.currentTime >= status.duration - 0.1
    ) {
      setVideoFinished(true);
    }
  };

  const handleDone = async () => {
    if (!video) return;
    if (video.appTrigger?.playOnce && !video.appTrigger.hasPlayed) {
      await updateVideo(video.id, {
        appTrigger: { ...video.appTrigger, hasPlayed: true },
        isActive: false,
      });
    }
    if (video.scheduledFor && (!video.repeat || video.repeat === 'never')) {
      await updateVideo(video.id, { isActive: false });
    }
    navigation.goBack();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!video || !player) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />

      {/* Skip button — only for triggered playback */}
      {isTriggered && (
        <Animated.View style={[styles.skipBtn, { top: insets.top + spacing.md, opacity: skipOpacity }]}>
          <TouchableOpacity onPress={handleDone} activeOpacity={0.85} style={styles.skipTouchable}>
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="play-skip-forward" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
        {/* Time row */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(duration)}
          </Text>
        </View>
        {/* Done button — only appears when video finishes */}
        {videoFinished && (
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      <BrandAlert {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  skipBtn: {
    position: 'absolute',
    right: spacing.lg,
  },
  skipTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { fontFamily: fonts.inter, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: spacing.sm,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9898d6',
    borderRadius: radius.full,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontFamily: fonts.inter, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: { fontFamily: fonts.montserratBold, fontSize: 15, color: '#fff' },
});
