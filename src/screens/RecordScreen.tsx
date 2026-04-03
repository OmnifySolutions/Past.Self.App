import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, PrefillData } from '../../App';
import { colors, fonts, spacing, radius } from '../styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Record'>;

const MAX_DURATION = 60;

// Spell-checked and grammar-reviewed prompts
const SCRIPT_PROMPTS = [
  "Hey — put the phone down and go do the one thing you've been avoiding.",
  "You said you'd start today. This is the reminder. Start now.",
  "Future me — remember why you began. Don't let today's version of you forget.",
  "Stop scrolling. You have 10 minutes. Use them.",
  "The version of you who did the work is waiting. Go become them.",
  "You're stronger than this moment of weakness. Prove it.",
  "I recorded this because I knew you'd need it. You know what to do.",
  "The discomfort is temporary. The regret of not trying lasts much longer.",
  "You're not lazy — you're scared. Do it scared.",
  "Look at yourself. Now go be the person you told yourself you'd become.",
  "This is your 3-second rule moment. 3... 2... 1... go.",
  "Your future self will either thank you or wish you had started today.",
];

export function RecordScreen({ navigation, route }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showPrompts, setShowPrompts] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const promptsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const durationRef = useRef(0);
  const recordingRef = useRef(false);
  const isMountedRef = useRef(true);

  const prefill = route.params?.prefill;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopAllTimers();
    };
  }, []);

  const [isFocused, setIsFocused] = useState(true);

  // Stop camera and recording when screen loses focus
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setCameraReady(false);
      return () => {
        setIsFocused(false);
        stopAllTimers();
        if (recordingRef.current && cameraRef.current) {
          try { cameraRef.current.stopRecording(); } catch (e) {}
          recordingRef.current = false;
        }
        if (isMountedRef.current) {
          setIsRecording(false);
          setCameraReady(false);
        }
      };
    }, [])
  );

  const stopAllTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pulseRef.current) { pulseRef.current.stop(); pulseRef.current = null; }
  };

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    if (pulseRef.current) { pulseRef.current.stop(); pulseRef.current = null; }
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleBack = () => {
    stopAllTimers();
    if (recordingRef.current && cameraRef.current) {
      try { cameraRef.current.stopRecording(); } catch (e) {}
      recordingRef.current = false;
    }
    navigation.goBack();
  };

  const togglePrompts = () => {
    const toValue = showPrompts ? 0 : 1;
    setShowPrompts(!showPrompts);
    Animated.timing(promptsAnim, { toValue, duration: 250, useNativeDriver: true }).start();
  };

  const startRecording = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setShowPrompts(false);
    durationRef.current = 0;
    setDuration(0);
    setIsRecording(true);
    recordingRef.current = true;
    startPulse();

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      if (isMountedRef.current) setDuration(durationRef.current);
      if (durationRef.current >= MAX_DURATION) stopRecording();
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      stopAllTimers();
      stopPulse();
      recordingRef.current = false;
      if (isMountedRef.current) setIsRecording(false);
      if (video && isMountedRef.current) {
        navigation.navigate('Schedule', {
          videoUri: video.uri,
          duration: durationRef.current,
          thumbnail: video.uri,
          prefill,
        });
      }
    } catch (e) {
      stopAllTimers();
      stopPulse();
      recordingRef.current = false;
      if (isMountedRef.current) setIsRecording(false);
    }
  };

  const stopRecording = () => {
    stopAllTimers();
    stopPulse();
    if (cameraRef.current && recordingRef.current) {
      try { cameraRef.current.stopRecording(); } catch (e) {}
    }
  };

  const progress = Math.min((duration / MAX_DURATION) * 100, 100);
  const isAlmostDone = duration >= MAX_DURATION - 10;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!cameraPermission || !micPermission) return <View style={styles.container} />;

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.permContainer]}>
        <Ionicons name="videocam-off" size={48} color={colors.danger} style={{ marginBottom: spacing.md }} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permBody}>Past.Self. needs camera and microphone access to record your messages.</Text>
        <TouchableOpacity style={styles.permButton} onPress={async () => {
          await requestCameraPermission();
          await requestMicPermission();
        }}>
          <Text style={styles.permButtonText}>Allow Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.textLight, fontFamily: fonts.inter }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          onCameraReady={() => setCameraReady(true)}
        />
      )}

      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{prefill ? 'Re-record Video' : 'Record Video'}</Text>
        {!isRecording ? (
          <TouchableOpacity
            onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}
            style={styles.iconBtn}
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </TouchableOpacity>
        ) : <View style={styles.iconBtn} />}
      </SafeAreaView>

      {/* Script prompts panel */}
      {!isRecording && (
        <Animated.View style={[styles.promptsPanel, {
          opacity: promptsAnim,
          transform: [{ translateY: promptsAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
          pointerEvents: showPrompts ? 'auto' : 'none',
        }]}>
          <Text style={styles.promptsTitle}>Need inspiration?</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {SCRIPT_PROMPTS.map((prompt, i) => (
              <View key={i} style={styles.promptItem}>
                <Ionicons name="chatbubble-outline" size={14} color="#9898d6" style={{ marginTop: 2 }} />
                <Text style={styles.promptText}>"{prompt}"</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Timer badge */}
      {isRecording && (
        <View style={styles.timerBadge}>
          <View style={styles.recDot} />
          <Text style={styles.timerText}>{formatTime(duration)}</Text>
        </View>
      )}

      {/* Progress bar */}
      {isRecording && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${progress}%` as any,
            backgroundColor: isAlmostDone ? colors.danger : '#9898d6',
          }]} />
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording && (
          <TouchableOpacity style={styles.promptsToggle} onPress={togglePrompts} activeOpacity={0.8}>
            <Ionicons name="bulb-outline" size={18} color="#fff" />
            <Text style={styles.promptsToggleText}>
              {showPrompts ? 'Hide prompts' : 'Need inspiration?'}
            </Text>
          </TouchableOpacity>
        )}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.85}
          >
            {isRecording
              ? <View style={styles.stopIcon} />
              : <Ionicons name="videocam" size={32} color="#fff" />
            }
          </TouchableOpacity>
        </Animated.View>
        {!isRecording && (
          <Text style={styles.hint}>{cameraReady ? 'Tap to record' : 'Camera loading...'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permContainer: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerTitle: { fontFamily: fonts.montserratBold, fontSize: 17, color: '#fff' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  promptsPanel: {
    position: 'absolute', top: 100, left: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.92)', borderRadius: radius.lg,
    padding: spacing.md, maxHeight: 260, zIndex: 10,
  },
  promptsTitle: { fontFamily: fonts.montserratBold, fontSize: 13, color: '#9898d6', marginBottom: spacing.sm },
  promptItem: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, alignItems: 'flex-start' },
  promptText: { fontFamily: fonts.inter, fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1, lineHeight: 19 },
  timerBadge: {
    position: 'absolute', top: 110, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  timerText: { fontFamily: fonts.inter, fontSize: 14, color: '#fff' },
  progressTrack: { position: 'absolute', bottom: 168, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%' },
  controls: { position: 'absolute', bottom: 56, alignSelf: 'center', alignItems: 'center', gap: spacing.sm },
  promptsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(152,152,214,0.25)', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(152,152,214,0.4)',
  },
  promptsToggleText: { fontFamily: fonts.inter, fontSize: 13, color: '#fff' },
  recordBtn: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
  },
  recordBtnActive: { backgroundColor: '#8b3a4a' },
  stopIcon: { width: 24, height: 24, backgroundColor: '#fff', borderRadius: 4 },
  hint: { fontFamily: fonts.inter, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  permTitle: { fontFamily: fonts.montserratBold, fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: spacing.sm },
  permBody: { fontFamily: fonts.inter, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: spacing.lg },
  permButton: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  permButtonText: { fontFamily: fonts.montserratBold, fontSize: 15, color: '#fff' },
});
