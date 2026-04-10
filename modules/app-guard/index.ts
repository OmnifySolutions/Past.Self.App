import { NativeModule, requireNativeModule } from 'expo';

export type WatchedApp = {
  packageName: string;  // e.g. "com.instagram.android"
  appName: string;      // e.g. "Instagram"
  videoUri: string;
  videoId: string;
  cooldownMs: number;   // milliseconds between re-triggers (default: 30 * 60 * 1000)
};

export type InstalledApp = {
  packageName: string;
  appName: string;
};

type AppGuardModuleType = NativeModule & {
  /** Returns whether the AccessibilityService is enabled for Past.Self. */
  isServiceEnabled(): boolean;

  /** Opens Android Accessibility Settings so the user can enable the service. */
  openAccessibilitySettings(): void;

  /**
   * Passes the current list of watched apps + their video URIs to the native service.
   * Call this whenever videos are added, edited, paused, or deleted.
   */
  setWatchedApps(apps: WatchedApp[]): void;

  /**
   * Returns all user-installed apps on the device via PackageManager.
   * Used to populate the app picker in ScheduleScreen / EditScreen.
   */
  getInstalledApps(): Promise<InstalledApp[]>;
};

const AppGuard = requireNativeModule<AppGuardModuleType>('AppGuard');
export default AppGuard;