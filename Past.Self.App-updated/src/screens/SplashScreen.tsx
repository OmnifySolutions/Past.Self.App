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

// Generate 150 sparkles spread across full screen with varied delays and sizes
const SPARKLES = Array.from({ length: 150 }, (_, i) => {
  const randomX = Math.random();
  const randomY = Math.random();
  const baseDelay = (i % 20) * 95;
  const delayVariation = Math.random() * 200;
  const sizeVariation = [1.5, 2, 2.5, 3, 3.5];
  
  return {
    x: width * randomX,
    y: height * randomY,
    delay: baseDelay + delayVariation,
    size: sizeVariation[Math.floor(Math.random() * sizeVariation.length)],
  };
});

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
