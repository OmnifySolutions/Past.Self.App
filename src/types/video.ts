// FIX: repeat typed as union literal — typos now caught at compile time
export type RepeatOption = 'never' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';

export interface ScheduledVideo {
  id: string;
  videoUri: string;
  thumbnail?: string;
  title: string;
  message: string;
  createdAt: string;
  scheduledFor?: string;
  repeat?: RepeatOption;         // FIX: was `string`, now strictly typed
  notificationId?: string;       // expo-notifications identifier — used to cancel on delete/edit
  appTrigger?: {
    appName: string;             // display name e.g. "Instagram"
    packageName: string;         // Android package e.g. "com.instagram.android"
    playOnce: boolean;
    hasPlayed?: boolean;
    cooldownMinutes: number;     // minutes between re-triggers (default 30, configurable in paid)
  };
  duration: number;
  isActive: boolean;   // controlled by the trigger system (played, expired, etc.)
  isPaused?: boolean;  // controlled by the user manually via the toggle on the card
}

export type TriggerType = 'datetime' | 'app';