export interface ScheduledVideo {
  id: string;
  videoUri: string;
  thumbnail?: string;
  title: string;
  message: string;
  createdAt: string;
  scheduledFor?: string;
  repeat?: string;
  appTrigger?: {
    appName: string;
    playOnce: boolean;
    hasPlayed?: boolean;
  };
  duration: number;
  isActive: boolean;
}

export type TriggerType = 'datetime' | 'app';
