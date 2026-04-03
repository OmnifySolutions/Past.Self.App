import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduledVideo } from '../types/video';

const STORAGE_KEY = 'pastself_videos';
const ONBOARDED_KEY = 'pastself_onboarded';

// Upsert - updates if ID exists, inserts if new. Prevents duplicates.
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
  const filtered = videos.filter(v => v.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const checkScheduledVideos = async (): Promise<ScheduledVideo | null> => {
  const videos = await getVideos();
  const now = new Date();
  for (const video of videos) {
    if (video.isActive && video.scheduledFor) {
      const scheduled = new Date(video.scheduledFor);
      if (scheduled <= now) return video;
    }
  }
  return null;
};

export const isOnboarded = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === 'true';
};

export const setOnboarded = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
};
