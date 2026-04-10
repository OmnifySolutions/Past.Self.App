# Past.Self. — Project Context

> Read before making any changes. Update after significant decisions.

---

## Core Instructions

- Be a business partner. Push back on weak ideas. Flag UX problems before implementing. Say when something works and why.
- **Never guess.** If information is missing, ask. Guessing produces worse results than asking.
- **95% confidence threshold** before writing any code. Ask until you're there.
- **Full files only.** Never give line-by-line edits. Always produce the complete file.
- **No narration.** Skip step-by-step diagnosis. Give a summary of what changed and why at the end.
- **Windows/PowerShell by default.** Never assume Mac. Commands on separate lines — `&&` doesn't work in PowerShell.
- **Reverting:** Reverse-engineer from changes made in the current session. Don't claim it's impossible.
- **Push reminder:** After any working state, remind Dary to push to GitHub. That's the only undo button.
- **Before any EAS build:** Run `npx expo-modules-autolinking generate-package-list --platform android --target ./test-output.json` and confirm `com.appguard.AppGuardModule` appears.

**Repo:** https://github.com/OmnifySolutions/Past.Self.App (public)
**Notion:** https://www.notion.so/339658ccff7b81d6ae3af855e35da702

**GitHub raw URL pattern:**
- ✅ `https://raw.githubusercontent.com/OmnifySolutions/Past.Self.App/main/App.tsx`
- ❌ `https://github.com/OmnifySolutions/Past.Self.App/blob/main/App.tsx` (blocked)

---

## App Overview

**Name:** Past.Self. (always with both periods)
**Concept:** Users record short video messages to their future selves. Each video is triggered to play at a scheduled date/time (local notification) or when a specific app is opened (App Guard). The emotional hook: your own voice and face is a stronger motivator than any notification.

**Founding vision / App Guard:** The app intercepts the user *before* they can open Instagram — not a swipeable notification, a forced full-screen video. This is the core product. Keep it in mind for all UX decisions.

---

## Tech Stack

- **Framework:** React Native + Expo SDK 54, TypeScript ~5.9.2
- **Navigation:** `@react-navigation/native` + `native-stack` only. `@react-navigation/stack` NOT installed.
- **Storage:** AsyncStorage
- **Camera:** expo-camera
- **Video playback:** expo-video (`expo-av` removed — do NOT re-add)
  - `useVideoPlayer` must be called at **top level only** — never in useEffect, never conditionally
  - `useEventListener` imported from `'expo'` NOT `'expo-video'`
  - `player.pause()` must be wrapped in try/catch on unmount (may already be released)
  - Set `player.timeUpdateEventInterval = 0.5` in player init callback
- **File system:** `expo-file-system/legacy` (always `/legacy` import)
- **Thumbnails:** `expo-video-thumbnails` — generated at save time from permanent URI
- **IDs:** `expo-crypto` → `Crypto.randomUUID()` — never `Date.now()`
- **Gradient:** expo-linear-gradient
- **Safe Area:** `useSafeAreaInsets()` hook everywhere. **NEVER** React Native's `SafeAreaView` — causes pink status bar gap on iOS.
- **Fonts:** Loaded from `assets/fonts/` local files via `Font.loadAsync()` — NOT from Google Fonts packages at runtime (network fetch caused 2–3 min hang on first install).
  ```typescript
  DancingScript_700Bold: require('./assets/fonts/DancingScript-Bold.ttf')
  Montserrat_500Medium:  require('./assets/fonts/Montserrat-Medium.ttf')
  Montserrat_700Bold:    require('./assets/fonts/Montserrat-Bold.ttf')
  Inter_400Regular:      require('./assets/fonts/Inter-Regular.ttf')
  Inter_500Medium:       require('./assets/fonts/Inter-Medium.ttf')
  ```
- **Icons:** @expo/vector-icons (Ionicons)
- **SVG:** react-native-svg
- **Gestures:** react-native-gesture-handler
- **Date Picker:** `@react-native-community/datetimepicker` — always TWO separate pickers: `mode="date"` then `mode="time"`. **NEVER** `mode="datetime"` — causes black screen on Android.
- **Notifications:** expo-notifications — local notifications for datetime triggers
  - Channel: `pastself-triggers`, AndroidImportance.MAX
  - `notificationId` stored per video for cancellation on delete/edit
  - Foreground handler suppresses UI (app handles playback inline)
  - `handledNotifRef` in App.tsx deduplicates notification responses

**Removed — do NOT re-add:** expo-av, expo-image-picker, expo-media-library, @react-navigation/stack

---

## Project Structure

```
PastSelfApp/
├── App.tsx                    # Root nav, font loading, trigger interval, notification listeners, AppGuard sync
├── app.json                   # plugins: expo-camera, expo-video, expo-notifications, ./modules/app-guard
├── assets/
│   ├── fonts/                 # Local font files
│   └── SparklesBG.mp4         # Looping sparkle video background for SplashScreen
├── modules/app-guard/         # Custom native Expo module for App Guard
└── src/
    ├── screens/               # SplashScreen, OnboardingCameraScreen, HomeScreen, RecordScreen,
    │                          #   ScheduleScreen, EditScreen, PlaybackScreen, ConfirmationScreen
    ├── components/BrandAlert.tsx  # Only modal component. BrandModal.tsx deleted.
    ├── utils/storage.ts
    ├── utils/repeatUtils.ts
    ├── types/video.ts         # ScheduledVideo + RepeatOption union type
    └── styles/theme.ts
```

**Deleted — do not recreate:** BrandModal.tsx, OnboardingScreen.tsx (3-slide walkthrough — cut deliberately), OnboardingIllustration.tsx

---

## Data Model

```typescript
type RepeatOption = 'never' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';
// Always use RepeatOption — never plain string

interface ScheduledVideo {
  id: string;              // Crypto.randomUUID()
  videoUri: string;        // documentDirectory/videos/{id}.mp4
  thumbnail?: string;      // documentDirectory/thumbnails/{id}.jpg
  title: string;
  message: string;
  createdAt: string;
  scheduledFor?: string;   // datetime trigger only
  repeat?: RepeatOption;
  notificationId?: string;
  appTrigger?: {
    appName: string;
    packageName: string;   // Required for AppGuard matching
    playOnce: boolean;
    hasPlayed?: boolean;
  };
  duration: number;
  isActive: boolean;       // trigger system — marks done/expired. NOT for user pause.
  isPaused?: boolean;      // user toggle — paused videos skip all trigger checks
}
```

AsyncStorage keys: `pastself_videos` | `pastself_onboarded` | `pastself_login_prompted`

---

## Navigation

```
App → SplashScreen (always)
  → First time:  OnboardingCameraScreen → Record → Schedule → Confirmation → Home
  → Returning:   ~1.7s branded animation → Home

Home → Record → Schedule → Confirmation → Home (stack reset)
     → Tap card → Edit → Confirmation → Home (stack reset)
     → Tap thumbnail → Playback (isTriggered: false) → Home
     → Auto-trigger / notification → Playback (isTriggered: true) → Home
```

**Critical rules:**
- ConfirmationScreen Done: `setOnboarded()` then `CommonActions.reset({ routes: [{ name: 'Home' }] })` — never `navigate('Home')` (creates duplicate)
- ScheduleScreen Re-record: `navigation.replace('Record', { prefill })` — not navigate
- App.tsx: wait for BOTH font loading AND `isOnboarded()` before rendering navigator. `isFirst` starts as `null` — navigator not rendered until it's a real boolean. This fixes the returning-user splash race condition.

---

## Key Logic

### Video Storage (ScheduleScreen / EditScreen)
1. `permanentDir = FileSystem.documentDirectory + 'videos/'`
2. Delete existing file at target path first (re-record safety)
3. `copyAsync` to permanent path
4. `expo-video-thumbnails` at `time: 500` from permanent URI
5. Copy thumbnail to `documentDirectory/thumbnails/{id}.jpg`
6. Save to AsyncStorage — **never** temp camera URIs

### Auto-trigger Architecture
- `checkScheduledVideos` called in HomeScreen's `useFocusEffect` — not during Splash
- Also runs on 30s interval + AppState foreground (both in App.tsx)
- One-shot datetime: marked `isActive: false` immediately. 5s staleness window — older triggers silently deactivated.
- Repeating datetime: `scheduledFor` advanced to next occurrence, old notification cancelled, new one scheduled
- `navigationRef.current?.isReady()` guard before navigate

### Pause Toggle
- Pausing: cancel OS notification, clear `notificationId` from storage
- Unpausing: reschedule notification if `scheduledFor` is in the future

### PlaybackScreen
- Two-component: `PlaybackScreen` (outer loader) + `PlayerView` (inner — mounts only when URI is real)
- Done button: always visible when `isTriggered: false`; only after video ends when `isTriggered: true`
- Skip: appears after 5s, only when `isTriggered: true`
- `handleDone`: only writes storage for `appTrigger.playOnce`. Datetime one-shots already marked inactive by `checkScheduledVideos` — do not double-write.
- Volume toggle: top-left pill, `player.muted` flips on tap. Session-only — does NOT persist.

### App Guard Architecture
- `syncWatchedApps()` in App.tsx sends active, non-paused app-trigger videos to native via `AppGuard.setWatchedApps(watched)`. Called on launch, foreground, after played event.
- `AppGuardService` (Kotlin AccessibilityService): listens `TYPE_WINDOW_STATE_CHANGED`, matches `packageName`, launches `InterceptActivity`
- `InterceptActivity`: full-screen video via Android `VideoView`, blocks back, skip after 5s, broadcasts `ACTION_VIDEO_PLAYED` on done
- JS listener in App.tsx: marks `hasPlayed: true` for playOnce, re-syncs watched list
- **Known issue:** Video not firing on app open — next debugging target. Suspected: `syncWatchedApps` not sending correctly, or `AppGuardService` not detecting window state change on Android 14 / One UI.

### HomeScreen Sub-components
All sub-components (SwipeableCard, DraggableList, SettingsModal, etc.) defined at **module level outside HomeScreen** — NEVER inline. Inline = remount on every render = flicker + animation resets.

### Onboarding Completion
`setOnboarded()` MUST be called in `ConfirmationScreen.handleDone` before navigating. If missing: every session treats user as first-time.

### Monthly Repeat
Clamps to last day of month: detects overflow via `next.getDate() !== originalDay`, rolls back with `setDate(0)`. Safety counter: 60 iterations.

### Login Prompt
Appears on ConfirmationScreen 800ms after mount. One-time only (`pastself_login_prompted`). Both buttons call `setLoginPromptSeen()`. Copy locked: title "Don't lose this." / body "This message took courage to record. A free account keeps it safe — forever."

---

## App Guard — Autolinking Lessons (critical before any EAS build)

- Module needs `build.gradle` in `modules/app-guard/android/` — without it, excluded from package list
- `build.gradle` must NOT use `expo-module-gradle-plugin` or `safeExtGet()` — use hardcoded SDK versions + `kotlin-android` plugin
- `expo-module.config.json` must have `name` field
- `package.json` in module root must exist with `name` and `main` fields
- Root `package.json` needs `expo.autolinking.nativeModulesDir: "./modules"`
- `Function()` blocks in Kotlin returning Unit must use `return@Function null`

Verify before every build:
```powershell
npx expo-modules-autolinking generate-package-list --platform android --target ./test-output.json
Get-Content test-output.json | Select-String "appguard"
```

---

## Brand

**Colors:**
- Background: `#fdf4f5` | Card: `#ffffff` | Danger/CTA: `#674454` | Accent: `#a194a8`
- AccentBlue: `#9898d6` (sparingly — settings icons, badges, prompts. Never primary actions)
- Text: `#14273c` (deep navy — reads near-black on white, intentional. Do not "fix" it.)
- Blush: `#fde5ea` | Border: `rgba(20,39,60,0.08)` | Overlay: `rgba(20,39,60,0.5)`

**Fonts:** Dancing Script Bold (app name) / Montserrat Bold (headers) / Montserrat Medium (subheaders) / Inter (body)

**Theme keys:** `colors.background/card/accent/accentPressed/text/textLight/danger/border/overlay` | `fonts.brittany/montserratBold/montserratMedium/inter/interMedium` | `spacing.xs/sm/md/lg/xl/xxl` | `radius.sm/md/lg/xl/full`

**Voice:** Direct. Personal (second person always). Warm but firm. No filler.

---

## Current State

### Working
- Full record → schedule → confirm → home flow
- Permanent video + thumbnail storage (randomUUID)
- expo-video playback (two-component pattern, correct event API)
- Date/time triggers via expo-notifications (split date/time pickers)
- App Guard native module linked, accessibility service working, app picker real
- **App Guard intercept firing correctly** — fixed NullPointerException in InterceptActivity.makeFullScreen() by moving it after setContentView()
- Edit + re-record, pause toggle, volume toggle
- Drag-to-reorder (Pressable onLongPress), swipe-to-delete
- SplashScreen MP4 background, returning user ~1.7s path
- Fonts from local assets
- Settings modal (animated bottom sheet)
- Login prompt (one-time, ConfirmationScreen)
- Notification deduplication (handledNotifRef)

### Known Issues / Pending
- Settings modal rows (Account, Cloud backup, Notifications, App Guard, About) are stubs.
- Rate Past.Self. URL: `idYOUR_APP_ID` placeholder — swap at submission.
- Multi-video trigger queue: only one fires per check cycle if two are past-due simultaneously. Low severity.
- Auth screen, cloud backup, final app icon — pre-submission items.

---

## Business Model

- **Free:** limited recordings, datetime trigger only, no repeat, App Guard cooldown locked at 30 min
- **Monthly — €2.99/month:** unlimited recordings, App Guard, configurable cooldown (1 min–24 hrs), repeat scheduling
- **Lifetime — €8.99 one-time:** everything in Monthly, forever
- No ads, ever. Non-negotiable.

### Cooldown Timer
App Guard intercept will not re-fire for the same app within the cooldown window. Prevents annoyance when multitasking.
- Default: 30 minutes (all users)
- Free users: locked at 30 minutes
- Paid users: configurable per video (1 min to 24 hrs) — UI to be added when subscription system is built
- Stored as `appTrigger.cooldownMinutes` per video, passed to native via `WatchedApp.cooldownMs`

---

## Commands

```powershell
npx expo start --clear
npx expo install [package]
eas build --profile development --platform android
eas build --profile development --platform ios
```

Dev reset (Settings modal, `__DEV__` only): `AsyncStorage.clear()` then `DevSettings.reload()`.
