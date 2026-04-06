import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fonts, spacing } from '../styles/theme';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const PHRASES = [
  'stop you from procrastinating',
  'break your bad habits',
  'remind you why you started',
  'stop you from wasting time...',
];

const SLIDE_MS = 260;
const HOLD_MS  = 1100;
const FADE_MS  = 220;

const VIDEO_SOURCE = require('../../assets/SparklesBG.mp4');

// Button height estimate — shimmer layers extend well beyond this for true diagonal
const BTN_HEIGHT = 56;
const SHIMMER_OVERSHOOT = 120;
const SHIMMER_HEIGHT = BTN_HEIGHT + SHIMMER_OVERSHOOT * 2;

// ---------------------------------------------------------------------------
// Shimmer button — diagonal sheen with depth, gradient background
// ---------------------------------------------------------------------------

function ShimmerButton({ onPress, label }: { onPress: () => void; label: string }) {
  // shimmerX: 0 = resting off right edge, 1 = fully off left edge
  const shimmerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(shimmerX, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // At rest (0): shifted right by full button width = invisible
  // At end (1): shifted left by full button width = invisible
  // Peak visibility is in the middle of the sweep
  const translateX = shimmerX.interpolate({
    inputRange: [0, 1],
    outputRange: [width, -width],
  });

  return (
    <TouchableOpacity
      style={styles.tryBtn}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Gradient background — burgundy to muted mauve */}
      <LinearGradient
        colors={['#674454', '#a194a8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <Text style={styles.tryBtnText}>{label}</Text>

      {/* Shimmer layers — SHIMMER_HEIGHT tall, offset upward so they're centered
          on the button. The extra height above/below creates the visible diagonal
          within the overflow:hidden clip region. */}

      {/* Layer 1 — wide soft base */}
      <Animated.View
        style={[styles.shimmerWide, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.04)',
            'rgba(255,255,255,0.16)',
            'rgba(255,255,255,0.04)',
            'transparent',
          ]}
          locations={[0, 0.28, 0.5, 0.72, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 2 — bright core */}
      <Animated.View
        style={[styles.shimmerNarrow, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.48)',
            'rgba(255,255,255,0.0)',
            'transparent',
          ]}
          locations={[0, 0.32, 0.5, 0.68, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Layer 3 — specular peak */}
      <Animated.View
        style={[styles.shimmerSpecular, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.0)',
            'rgba(255,255,255,0.72)',
            'rgba(255,255,255,0.0)',
            'transparent',
          ]}
          locations={[0, 0.36, 0.5, 0.64, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

type InnerProps = Props & { onReady: () => void };

function SplashInner({ navigation, route, onReady }: InnerProps) {
  const isFirstTime = route.params?.isFirstTime ?? true;

  const [phraseIndex, setPhraseIndex] = useState(isFirstTime ? 0 : PHRASES.length - 1);
  const [showButton, setShowButton]   = useState(false);

  const activeRef = useRef(true);
  const doneRef   = useRef(false);
  const pulseRef  = useRef<Animated.CompositeAnimation | null>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY       = useRef(new Animated.Value(20)).current;
  const phraseX       = useRef(new Animated.Value(width * 0.35)).current;
  const phraseOpacity = useRef(new Animated.Value(isFirstTime ? 0 : 1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY       = useRef(new Animated.Value(14)).current;
  const buttonScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity   = useRef(new Animated.Value(0.2)).current;

  const player = useVideoPlayer(VIDEO_SOURCE, p => {
    p.loop  = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    return () => {
      activeRef.current = false;
      pulseRef.current?.stop();
      try { player.pause(); } catch (_) {}
    };
  }, []);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') onReady();
  });

  useEffect(() => {
    activeRef.current = true;

    if (!isFirstTime) {
      phraseX.setValue(0);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(headerY,       { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(1200),
      ]).start(() => {
        if (activeRef.current) navigation.replace('Home');
      });
      return;
    }

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(headerY,       { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(400),
    ]).start(() => {
      if (activeRef.current) runPhrase(0);
    });

    return () => {
      activeRef.current = false;
      pulseRef.current?.stop();
    };
  }, []);

  const runPhrase = (index: number) => {
    if (!activeRef.current) return;
    const isLast = index === PHRASES.length - 1;

    setPhraseIndex(index);
    phraseX.setValue(width * 0.35);
    phraseOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(phraseX,       { toValue: 0, duration: SLIDE_MS, useNativeDriver: true }),
      Animated.timing(phraseOpacity, { toValue: 1, duration: SLIDE_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished || !activeRef.current) return;
      setTimeout(() => {
        if (!activeRef.current) return;
        if (isLast) {
          if (!doneRef.current) { doneRef.current = true; showCTA(); }
          return;
        }
        Animated.timing(phraseOpacity, {
          toValue: 0, duration: FADE_MS, useNativeDriver: true,
        }).start(({ finished: fadeDone }) => {
          if (fadeDone && activeRef.current) runPhrase(index + 1);
        });
      }, HOLD_MS);
    });
  };

  const showCTA = () => {
    setShowButton(true);
    Animated.parallel([
      Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(buttonY,       { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => startPulse());
  };

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(buttonScale, { toValue: 1.055, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1,     duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonScale, { toValue: 1,   duration: 1000, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        ]),
      ])
    );
    pulseRef.current.start();
  };

  const handleTryNow = () => {
    activeRef.current = false;
    pulseRef.current?.stop();
    try { player.pause(); } catch (_) {}
    navigation.replace('OnboardingCamera');
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={styles.overlay} />

      <Animated.View style={[
        styles.textArea,
        { opacity: headerOpacity, transform: [{ translateY: headerY }] },
      ]}>
        <Text style={styles.line1}>What if your</Text>
        <Text style={styles.brandName}>Past.Self.</Text>
        <Text style={styles.couldText}>could...</Text>
      </Animated.View>

      <Animated.View style={[
        styles.phraseArea,
        { opacity: phraseOpacity, transform: [{ translateX: phraseX }] },
      ]}>
        <Text style={styles.changingPhrase} numberOfLines={2}>
          {PHRASES[phraseIndex]}
        </Text>
      </Animated.View>

      {showButton && (
        <Animated.View style={[
          styles.buttonArea,
          { opacity: buttonOpacity, transform: [{ translateY: buttonY }, { scale: buttonScale }] },
        ]}>
          <Animated.View style={[styles.glowOuter, { opacity: glowOpacity }]} />
          <Animated.View style={[styles.glowInner, { opacity: glowOpacity }]} />
          <ShimmerButton onPress={handleTryNow} label="Try It Now!" />
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Outer shell
// ---------------------------------------------------------------------------

export function SplashScreen(props: Props) {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <>
      <SplashInner {...props} onReady={() => setVideoReady(true)} />
      {!videoReady && <View style={styles.cover} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf4f5',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253, 244, 245, 0.25)',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fdf4f5',
  },
  textArea: {
    position: 'absolute',
    top: height * 0.22,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
  },
  line1: {
    fontFamily: fonts.montserratBold,
    fontSize: 26,
    color: '#14273c',
    lineHeight: 34,
    marginBottom: 2,
  },
  brandName: {
    fontFamily: fonts.brittany,
    fontSize: 56,
    lineHeight: 76,
    color: '#674454',
  },
  couldText: {
    fontFamily: fonts.montserratBold,
    fontSize: 26,
    color: '#14273c',
    lineHeight: 34,
    marginTop: 2,
  },
  phraseArea: {
    position: 'absolute',
    top: height * 0.22 + 34 + 76 + 34 + spacing.lg,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
    height: 70,
  },
  changingPhrase: {
    fontFamily: fonts.montserratBold,
    fontSize: 22,
    color: '#9898d6',
    lineHeight: 30,
  },
  buttonArea: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  glowOuter: {
    position: 'absolute',
    top: -20, left: -20, right: -20, bottom: -20,
    borderRadius: 30,
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 0,
  },
  glowInner: {
    position: 'absolute',
    top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: 18,
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 0,
  },
  tryBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // No backgroundColor — LinearGradient fills it
  },
  tryBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
    zIndex: 1, // sits above gradient layers
  },
  // Each shimmer layer is exactly button-width so the gradient fills it correctly.
  // translateX moves them from off-right to off-left during the sweep.
  // The tall height + diagonal start/end creates the angled sheen.
  shimmerWide: {
    position: 'absolute',
    top: -SHIMMER_OVERSHOOT,
    left: 0,
    right: 0,
    height: SHIMMER_HEIGHT,
  },
  shimmerNarrow: {
    position: 'absolute',
    top: -SHIMMER_OVERSHOOT,
    left: 0,
    right: 0,
    height: SHIMMER_HEIGHT,
  },
  shimmerSpecular: {
    position: 'absolute',
    top: -SHIMMER_OVERSHOOT,
    left: 0,
    right: 0,
    height: SHIMMER_HEIGHT,
  },
});
