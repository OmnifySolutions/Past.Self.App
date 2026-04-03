import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Rect } from 'react-native-svg';
import { RootStackParamList } from '../../App';
import { fonts, spacing, radius } from '../styles/theme';

const { height } = Dimensions.get('window');
type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingCamera'>;

// Pure camera body — lens, bump, flash dot only
const CameraIcon = ({ size = 48, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Viewfinder bump */}
    <Rect x="13" y="8" width="10" height="5" rx="2.5" stroke={color} strokeWidth="1.8" />
    {/* Camera body */}
    <Rect x="3" y="13" width="34" height="24" rx="6" stroke={color} strokeWidth="2.2" />
    {/* Lens outer */}
    <Circle cx="20" cy="25" r="8" stroke={color} strokeWidth="2" />
    {/* Lens inner */}
    <Circle cx="20" cy="25" r="3.5" fill={color} opacity={0.75} />
    {/* Flash dot */}
    <Circle cx="32" cy="19" r="1.8" fill={color} opacity={0.55} />
  </Svg>
);

const PROMPTS = [
  'feel like giving up.',
  'want to scroll instead of work.',
  'open Instagram out of habit.',
  'doubt yourself.',
  'need a push to start.',
  'want to stay consistent.',
];

export function OnboardingCameraScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [promptIndex, setPromptIndex] = useState(0);
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => cyclePrompts(0));
  }, []);

  const cyclePrompts = (index: number) => {
    const realIndex = index % PROMPTS.length;
    setPromptIndex(realIndex);
    promptOpacity.setValue(0);

    Animated.timing(promptOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(promptOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
          .start(() => setTimeout(() => cyclePrompts(index + 1), 80));
      }, 1800);
    });
  };

  return (
    <LinearGradient
      colors={['#6b3f52', '#52303f', '#35202c']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
        <Animated.View style={[styles.inner, {
          opacity: contentOpacity,
          transform: [{ translateY: contentY }],
        }]}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <CameraIcon size={46} color="#fff" />
          </View>

          <Text style={styles.instruction}>
            Record a message for{'\n'}your future self
          </Text>
          <Text style={styles.nextTime}>next time you</Text>

          {/* Animated prompt in accent blue */}
          <View style={styles.promptContainer}>
            <Animated.Text
              style={[styles.prompt, { opacity: promptOpacity }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {PROMPTS[promptIndex]}
            </Animated.Text>
          </View>

          <Text style={styles.hint}>
            Be honest. Be direct.{'\n'}Your future self is listening.
          </Text>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={() => navigation.navigate('Record', { prefill: undefined })}
          activeOpacity={0.85}
        >
          <CameraIcon size={20} color="#fff" />
          <Text style={styles.recordBtnText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  instruction: {
    fontFamily: fonts.montserratBold,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },
  nextTime: {
    fontFamily: fonts.montserratMedium,
    fontSize: 17,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  promptContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.xs,
  },
  prompt: {
    fontFamily: fonts.montserratBold,
    fontSize: 19,
    color: '#9898d6',
    textAlign: 'center',
    lineHeight: 26,
  },
  hint: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  recordBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  recordBtnText: {
    fontFamily: fonts.montserratBold,
    fontSize: 16,
    color: '#fff',
  },
});
