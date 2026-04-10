import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduledVideo } from '../types/video';
import { getNextOccurrence } from './repeatUtils';

const STORAGE_KEY   = 'pastself_videos';
const ONBOARDED_KEY = 'pastself_onboarded';

// ─── Notification helpers ─────────────────────────────────────────────────────
//
// Android: uses a full-screen intent — appears over the lockscreen like an alarm.
// iOS: standard local notification — user taps to open. Apple does not allow
//      full-screen intents outside of CallKit. This is a platform constraint,
//      not something we can work around.
//
// The notification carries the videoId in its data payload. App.tsx listens for
// notification responses and calls triggerPlayback(videoId) when one arrives.

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleVideoNotification = async (
  video: ScheduledVideo
): Promise<string | null> => {
  if (!video.scheduledFor || video.isPaused) return null;

  const scheduledDate = new Date(video.scheduledFor);
  if (scheduledDate <= new Date()) return null; // already in the past — don't schedule

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: video.title,
        body: 'Your past self has a message for you.',
        data: { videoId: video.id },
        sound: true,
        ...(Platform.OS === 'android' && {
          // Full-screen intent: appears over lockscreen without user tapping
          priority: Notifications.AndroidNotificationPriority.MAX,
          // @ts-ignore — expo-notifications exposes this on Android content
          fullScreenIntent: true,
          sticky: false,
          vibrate: [0, 250, 250, 250],
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledDate,
      },
    });
    return notificationId;
  } catch (e) {
    console.warn('[notifications] Failed to schedule:', e);
    return null;
  }
};

export const cancelVideoNotification = async (notificationId?: string): Promise<void> => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may have already fired — safe to ignore
  }
};

// ─── Storage ──────────────────────────────────────────────────────────────────

// Upsert — updates if ID exists, inserts if new. Prevents duplicates.
export const saveVideo = async (video: ScheduledVideo): Promise<void> => {
  const videos = await getVideos();
  const existingIndex = videos.findIndex(v => v.id === video.id);
  if (existingIndex !== -1) {
    videos[existingIndex] = video;
  } else {
    videos.push(video);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
};

export const getVideos = async (): Promise<ScheduledVideo[]> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveVideos = async (videos: ScheduledVideo[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
};

export const updateVideo = async (id: string, updates: Partial<ScheduledVideo>): Promise<void> => {
  const videos = await getVideos();
  const index = videos.findIndex(v => v.id === id);
  if (index !== -1) {
    videos[index] = { ...videos[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  }
};

export const deleteVideo = async (id: string): Promise<void> => {
  const videos = await getVideos();
  const target = videos.find(v => v.id === id);
  // Cancel any pending notification before deleting
  if (target?.notificationId) {
    await cancelVideoNotification(target.notificationId);
  }
  const filtered = videos.filter(v => v.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// ─── Trigger check ────────────────────────────────────────────────────────────
//
// This runs while the app is open (30s interval + foreground event in App.tsx).
// For datetime triggers: notifications handle delivery when the app is closed.
// This function is now mainly a safety net for when the app is already open at
// trigger time, and handles advancing repeating schedules after notification fires.
//
// One-shot videos: the notification fires at exact time. When the user opens the
// app via the notification, App.tsx handles playback directly from the notification
// response — this check is not involved.
//
// This check still handles the case where the app is open at trigger time
// (notification fires anyway, but we catch it here first and play inline).

export const checkScheduledVideos = async (): Promise<ScheduledVideo | null> => {
  const videos = await getVideos();
  const now = new Date();

  for (const video of videos) {
    if (!video.isActive || video.isPaused) continue;

    // App triggers are handled exclusively by AppGuardService (native).
    // Skip here unconditionally so they never fall through to datetime logic.
    if (video.appTrigger) continue;

    if (video.scheduledFor) {
      const scheduled = new Date(video.scheduledFor);

      // Not yet due
      if (scheduled > now) continue;

      const isOneShot = !video.repeat || video.repeat === 'never';

      if (isOneShot) {
        // Only trigger if within a 60-second window — the app was open at the exact time.
        // Anything older was already handled by the notification; don't re-trigger.
        const ageMs = now.getTime() - scheduled.getTime();
        if (ageMs > 60_000) {
          // Stale — deactivate silently. Notification already handled (or was missed).
          await updateVideo(video.id, { isActive: false });
          continue;
        }
        await updateVideo(video.id, { isActive: false });
      } else {
        // Repeating — advance to next occurrence and reschedule notification
        const next = getNextOccurrence(video.scheduledFor, video.repeat!);
        if (next) {
          // Cancel old notification, schedule new one for next occurrence
          await cancelVideoNotification(video.notificationId);
          const updatedVideo: Partial<ScheduledVideo> = { scheduledFor: next.toISOString() };
          // Schedule next notification
          const tempVideo = { ...video, scheduledFor: next.toISOString() };
          const newNotificationId = await scheduleVideoNotification(tempVideo);
          if (newNotificationId) updatedVideo.notificationId = newNotificationId;
          await updateVideo(video.id, updatedVideo);
        } else {
          await cancelVideoNotification(video.notificationId);
          await updateVideo(video.id, { isActive: false });
          continue;
        }
      }

      return video;
    }

  }

  return null;
};

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const isOnboarded = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === 'true';
};

export const setOnboarded = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
};

// ─── Login prompt ─────────────────────────────────────────────────────────────
// One-time flag — shown once on ConfirmationScreen after first save.
const LOGIN_PROMPT_KEY = 'pastself_login_prompted';

export const hasSeenLoginPrompt = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(LOGIN_PROMPT_KEY);
  return val === 'true';
};

export const setLoginPromptSeen = async (): Promise<void> => {
  await AsyncStorage.setItem(LOGIN_PROMPT_KEY, 'true');
};