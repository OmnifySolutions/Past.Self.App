import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fonts, spacing } from '../styles/theme';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const CHANGING_PHRASES = [
  'stop you from procrastinating.',
  'break your bad habits.',
  'remind you why you started.',
  'stop you from wasting time.',
];

// Individual sparkle — drifts softly and fades
const Sparkle = ({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 3000 + Math.random() * 2000;
    const loop = () => {
      opacity.setValue(0);
      scale.setValue(0.4);
      translateY.setValue(0);
      Animated.sequence([
        Animated.delay(delay + Math.random() * 1000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.55, duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.6, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: duration * 0.6, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(loop, 800 + Math.random() * 2000));
    };
    loop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [{ scale }, { translateY }],
      }}
    >
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#c9a0aa',
      }} />
    </Animated.View>
  );
};

// Fixed sparkle positions — dense, spread across full screen
const SPARKLES = [
  { x: width * 0.18, y: height * 0.28, delay: 0,    size: 3 },
  { x: width * 0.72, y: height * 0.22, delay: 600,  size: 2.5 },
  { x: width * 0.45, y: height * 0.35, delay: 1200, size: 2 },
  { x: width * 0.85, y: height * 0.42, delay: 300,  size: 3.5 },
  { x: width * 0.12, y: height * 0.55, delay: 900,  size: 2 },
  { x: width * 0.60, y: height * 0.18, delay: 1500, size: 2.5 },
  { x: width * 0.30, y: height * 0.65, delay: 400,  size: 3 },
  { x: width * 0.78, y: height * 0.60, delay: 1100, size: 2 },
  { x: width * 0.50, y: height * 0.72, delay: 700,  size: 2.5 },
  { x: width * 0.22, y: height * 0.40, delay: 1800, size: 2 },
  { x: width * 0.90, y: height * 0.32, delay: 200,  size: 3 },
  { x: width * 0.38, y: height * 0.50, delay: 1400, size: 2 },
  { x: width * 0.08, y: height * 0.15, delay: 500,  size: 2.5 },
  { x: width * 0.65, y: height * 0.08, delay: 800,  size: 3 },
  { x: width * 0.92, y: height * 0.72, delay: 1600, size: 2 },
  { x: width * 0.05, y: height * 0.80, delay: 250,  size: 3.5 },
  { x: width * 0.55, y: height * 0.88, delay: 1000, size: 2 },
  { x: width * 0.33, y: height * 0.12, delay: 1700, size: 2.5 },
  { x: width * 0.80, y: height * 0.10, delay: 350,  size: 3 },
  { x: width * 0.15, y: height * 0.70, delay: 1300, size: 2 },
  { x: width * 0.70, y: height * 0.78, delay: 650,  size: 3.5 },
  { x: width * 0.42, y: height * 0.20, delay: 950,  size: 2 },
  { x: width * 0.25, y: height * 0.90, delay: 1450, size: 2.5 },
  { x: width * 0.88, y: height * 0.85, delay: 75,   size: 3 },
  { x: width * 0.03, y: height * 0.50, delay: 1150, size: 2 },
  { x: width * 0.95, y: height * 0.55, delay: 525,  size: 2.5 },
  { x: width * 0.48, y: height * 0.95, delay: 1850, size: 3 },
  { x: width * 0.58, y: height * 0.48, delay: 725,  size: 2 },
  { x: width * 0.27, y: height * 0.05, delay: 1025, size: 3.5 },
  { x: width * 0.82, y: height * 0.25, delay: 375,  size: 2 },
  { x: width * 0.10, y: height * 0.92, delay: 1575, size: 2.5 },
  { x: width * 0.68, y: height * 0.32, delay: 875,  size: 3 },
  { x: width * 0.40, y: height * 0.78, delay: 175,  size: 2 },
  { x: width * 0.93, y: height * 0.18, delay: 1275, size: 2.5 },
  { x: width * 0.20, y: height * 0.58, delay: 625,  size: 3 },
  { x: width * 0.75, y: height * 0.45, delay: 1425, size: 2 },
];

export function SplashScreen({ navigation, route }: Props) {
  const isFirstTime = route.params?.isFirstTime ?? true;
  const [currentPhrase, setCurrentPhrase] = useState(CHANGING_PHRASES[0]);
  const [showButton, setShowButton] = useState(false);
  // Track if button already shown to avoid re-triggering
  const buttonShownRef = useRef(false);
  // Track cycling to prevent double-fire
  const isCyclingRef = useRef(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(24)).current;
  const phraseX = useRef(new Animated.Value(width)).current;
  const phraseOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!isFirstTime) {
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(headerY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.delay(900),
      ]).start(() => navigation.replace('Home'));
      return;
    }

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(200),
    ]).start(() => {
      if (!isCyclingRef.current) {
        isCyclingRef.current = true;
        cyclePhrase(0);
      }
    });
  }, []);

  const cyclePhrase = (index: number) => {
    const realIndex = index % CHANGING_PHRASES.length;

    // Reset and set new phrase BEFORE animating in
    phraseX.setValue(width * 0.4);
    phraseOpacity.setValue(0);
    setCurrentPhrase(CHANGING_PHRASES[realIndex]);

    // Animate in
    Animated.parallel([
      Animated.timing(phraseX, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(phraseOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;

      // Hold
      setTimeout(() => {
        // On last phrase — don't fade out, just freeze and show button
        if (index === CHANGING_PHRASES.length - 1 && !buttonShownRef.current) {
          buttonShownRef.current = true;
          setShowButton(true);
          Animated.parallel([
            Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(buttonY, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start();
          return; // Phrase stays visible, stop cycling
        }

        // Animate out then next phrase
        Animated.timing(phraseOpacity, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(({ finished: outFinished }) => {
            if (!outFinished) return;
            setTimeout(() => cyclePhrase(index + 1), 120);
          });
      }, 1100);
    });
  };

  return (
    <LinearGradient
      colors={['#fdf4f5', '#f8e8ed', '#e8c0cd']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Sparkles layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} />
        ))}
      </View>

      {/* Header block */}
      <Animated.View style={[styles.textArea, {
        opacity: headerOpacity,
        transform: [{ translateY: headerY }],
      }]}>
        <Text style={styles.line1}>What if your</Text>
        <Text style={styles.brandName}>Past.Self.</Text>
        <Text style={styles.couldText}>could...</Text>
      </Animated.View>

      {/* Changing phrase */}
      <Animated.View style={[styles.phraseArea, {
        opacity: phraseOpacity,
        transform: [{ translateX: phraseX }],
      }]}>
        <Text style={styles.changingPhrase} numberOfLines={1} adjustsFontSizeToFit>
          {currentPhrase}
        </Text>
      </Animated.View>

      {/* CTA */}
      {showButton && (
        <Animated.View style={[styles.buttonArea, {
          opacity: buttonOpacity,
          transform: [{ translateY: buttonY }],
        }]}>
          <TouchableOpacity
            style={styles.tryBtn}
            onPress={() => navigation.replace('OnboardingCamera')}
            activeOpacity={0.85}
          >
            <Text style={styles.tryBtnText}>Try It Now!</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
    color: '#674454',
    lineHeight: 62,
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
    top: height * 0.22 + 34 + 62 + 34 + spacing.lg,
    left: spacing.lg + 4,
    right: spacing.lg + 4,
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
  tryBtn: {
    width: '100%',
    backgroundColor: '#674454',
    borderRadius: 12,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tryBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
