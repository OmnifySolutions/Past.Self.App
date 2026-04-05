import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Montserrat_500Medium, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { isOnboarded, checkScheduledVideos } from './src/utils/storage';
import { SplashScreen as AppSplash } from './src/screens/SplashScreen';
import { OnboardingCameraScreen } from './src/screens/OnboardingCameraScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { PlaybackScreen } from './src/screens/PlaybackScreen';
import { EditScreen } from './src/screens/EditScreen';
import { ConfirmationScreen } from './src/screens/ConfirmationScreen';
import { RepeatOption } from './src/types/video';

SplashScreen.preventAutoHideAsync();

export interface PrefillData {
  id?: string;
  title?: string;
  message?: string;
  triggerType?: 'datetime' | 'app';
  scheduledFor?: string;
  repeat?: RepeatOption;
  appName?: string;
  playOnce?: boolean;
  createdAt?: string;
}

export type RootStackParamList = {
  Splash:          { isFirstTime: boolean };
  OnboardingCamera: undefined;
  Home:            undefined;
  Record:          { prefill?: PrefillData } | undefined;
  Schedule: {
    videoUri:   string;
    duration:   number;
    thumbnail:  string;
    prefill?:   PrefillData;
  };
  Playback:        { videoId: string; isTriggered?: boolean };
  Edit:            { videoId: string };
  Confirmation: {
    videoId:      string;
    thumbnail:    string;
    title:        string;
    message?:     string;
    scheduledFor?: string;
    repeat?:      RepeatOption;
    appName?:     string;
    playOnce?:    boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  // FIX: isFirst starts as null — we don't render until we know the real value
  const [isFirst, setIsFirst] = useState<boolean | null>(null);

  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const triggerPlayback = useCallback((videoId: string) => {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate('Playback', { videoId, isTriggered: true });
    }
  }, []);

  const checkVideos = useCallback(async () => {
    const video = await checkScheduledVideos();
    if (video) triggerPlayback(video.id);
  }, [triggerPlayback]);

  useEffect(() => {
    const interval = setInterval(checkVideos, 30000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkVideos();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [checkVideos]);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          DancingScript_700Bold,
          Montserrat_500Medium,
          Montserrat_700Bold,
          Inter_400Regular,
          Inter_500Medium,
        });
        const onboarded = await isOnboarded();
        // FIX: set isFirst only after async resolution — this is the real value
        setIsFirst(!onboarded);
      } catch (e) {
        console.warn('[App] Font loading failed — using system fonts:', e);
        // FIX: still need to set isFirst even on error so app doesn't hang
        try {
          const onboarded = await isOnboarded();
          setIsFirst(!onboarded);
        } catch {
          setIsFirst(false); // safe fallback: treat as returning user
        }
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  // FIX: Don't render until both fonts are loaded AND we know onboarding state.
  // Previously isFirst defaulted to `true` and initialParams fired before
  // isOnboarded() resolved — so returning users always saw the first-time splash.
  if (!appReady || isFirst === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} onReady={onLayoutRootView}>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            {/*
              FIX: Pass isFirstTime via initialParams AFTER async resolution.
              Because isFirst is now settled before render, initialParams is
              correct on first mount — no race condition.
            */}
            <Stack.Screen
              name="Splash"
              component={AppSplash}
              initialParams={{ isFirstTime: isFirst }}
            />
            <Stack.Screen name="OnboardingCamera" component={OnboardingCameraScreen} />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Record"
              component={RecordScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Playback"
              component={PlaybackScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="Edit"
              component={EditScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Confirmation"
              component={ConfirmationScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
