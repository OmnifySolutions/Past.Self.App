import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fonts, spacing } from '../styles/theme';

const { width, height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const CHANGING_PHRASES = [
  'stop you from wasting time.',
  'break your bad habits.',
  'stop you from procrastinating.',
  'remind you why you started.',
];

export function SplashScreen({ navigation, route }: Props) {
  const isFirstTime = route.params?.isFirstTime ?? true;
  const [currentPhrase, setCurrentPhrase] = useState(CHANGING_PHRASES[0]);
  const [showButton, setShowButton] = useState(false);

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
    ]).start(() => cyclePhrase(0));
  }, []);

  const slideInPhrase = (index: number, phrase: string, cb: () => void) => {
    phraseX.setValue(width * 0.4);
    phraseOpacity.setValue(0);
    setCurrentPhrase(phrase);

    Animated.parallel([
      Animated.timing(phraseX, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(phraseOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(phraseOpacity, { toValue: 0, duration: 250, useNativeDriver: true })
          .start(() => setTimeout(cb, 80));
      }, 1000);
    });
  };

  const cyclePhrase = (index: number) => {
    const realIndex = index % CHANGING_PHRASES.length;
    slideInPhrase(realIndex, CHANGING_PHRASES[realIndex], () => {
      if (index === CHANGING_PHRASES.length - 1 && !showButton) {
        setShowButton(true);
        Animated.parallel([
          Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(buttonY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
      }
      cyclePhrase(index + 1);
    });
  };

  return (
    <LinearGradient
      colors={['#fdf4f5', '#f8e8ed', '#f2d5de']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

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
            <Text style={styles.tryBtnText}>Try It Now</Text>
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
  },
  tryBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
