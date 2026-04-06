import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Foreground handler: suppress — app is open, checkScheduledVideos handles it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Android channel — required for notifications on Android 8+.
if (typeof Notifications.setNotificationChannelAsync === 'function') {
  Notifications.setNotificationChannelAsync('pastself-triggers', {
    name: 'Video Triggers',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    showBadge: false,
  });
}

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
  const [isFirst, setIsFirst] = useState<boolean | null>(null);

  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const handledNotifRef = useRef<string | null>(null);

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

    // Fires when user taps a notification while app is backgrounded/closed
    const notifSub = Notifications.addNotificationResponseReceivedListener(response => {
      const videoId = response.notification.request.content.data?.videoId as string | undefined;
      if (videoId) triggerPlayback(videoId);
    });

    // Handle cold-start via notification tap (app was fully closed).
    // We track the notification identifier so we only act on it once —
    // response.notification.date is unreliable across Android versions.
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const identifier = response.notification.request.identifier;
      const consumed = handledNotifRef.current;
      if (consumed === identifier) return; // already handled this one
      handledNotifRef.current = identifier;
      const videoId = response.notification.request.content.data?.videoId as string | undefined;
      if (videoId) setTimeout(() => triggerPlayback(videoId), 1000);
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      notifSub.remove();
    };
  }, [checkVideos, triggerPlayback]);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          DancingScript_700Bold: require('./assets/fonts/DancingScript-Bold.ttf'),
          Montserrat_500Medium: require('./assets/fonts/Montserrat-Medium.ttf'),
          Montserrat_700Bold: require('./assets/fonts/Montserrat-Bold.ttf'),
          Inter_400Regular: require('./assets/fonts/Inter-Regular.ttf'),
          Inter_500Medium: require('./assets/fonts/Inter-Medium.ttf'),
        });
        const onboarded = await isOnboarded();
        setIsFirst(!onboarded);
      } catch (e) {
        console.warn('[App] Font loading failed — using system fonts:', e);
        try {
          const onboarded = await isOnboarded();
          setIsFirst(!onboarded);
        } catch {
          setIsFirst(false);
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