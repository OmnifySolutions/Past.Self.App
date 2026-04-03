# Past.Self. — Complete Project Context

> This file is the single source of truth for the Past.Self. app. Read this before making any changes. Update this file whenever significant features, design decisions, or architecture changes are made.

---

## App Overview

**Name:** Past.Self. (with periods — always written exactly like this)
**Tagline:** Messages from your past to your future
**Concept:** Users record short video messages to their future selves. Each video is triggered to play at a specific moment — either at a scheduled date/time (like an alarm, but video instead of sound) or when the user opens a specific app (e.g. Instagram). The purpose is motivation, accountability, habit-breaking, reminders, and self-persuasion.

**Why it works psychologically:** Hearing your own voice and seeing your own face creates a stronger emotional response than any external notification or quote. Your past self becomes your coach.

---

## Tech Stack

- **Framework:** React Native with Expo (SDK 53+)
- **Language:** TypeScript
- **Navigation:** `@react-navigation/native` + `@react-navigation/native-stack`
- **Storage:** `@react-native-async-storage/async-storage`
- **Camera/Video:** `expo-camera`, `expo-av` (deprecated but still functional — migrate to `expo-video` before App Store submission)
- **Fonts:** `@expo-google-fonts/dancing-script`, `@expo-google-fonts/montserrat`, `@expo-google-fonts/inter`
- **Icons:** `@expo/vector-icons` (Ionicons)
- **SVG:** `react-native-svg`
- **Gestures:** `react-native-gesture-handler`
- **Safe Area:** `react-native-safe-area-context`
- **Date Picker:** `@react-native-community/datetimepicker`

---

## Project Structure

```
PastSelfApp/
├── App.tsx                          # Root navigation, font loading, auto-trigger check
├── app.json                         # Expo config (no web platform, no splash.png)
├── CLAUDE.md                        # This file
└── src/
    ├── screens/
    │   ├── SplashScreen.tsx         # Cinematic opening animation (every app open)
    │   ├── OnboardingCameraScreen.tsx # First-time: force user to record immediately
    │   ├── HomeScreen.tsx           # Main screen with video list
    │   ├── RecordScreen.tsx         # Camera recording with prompts
    │   ├── ScheduleScreen.tsx       # Set trigger (date/time or app) after recording
    │   ├── EditScreen.tsx           # Edit existing video settings
    │   ├── PlaybackScreen.tsx       # Full-screen video playback
    │   └── ConfirmationScreen.tsx   # Shown after save/edit — manual Done button
    ├── components/
    │   └── BrandAlert.tsx           # Branded modal replacing all system alerts
    ├── utils/
    │   ├── storage.ts               # AsyncStorage CRUD (upsert pattern — no duplicates)
    │   └── repeatUtils.ts           # Repeat schedule calculations (next date, descriptions)
    ├── types/
    │   └── video.ts                 # ScheduledVideo interface, TriggerType
    └── styles/
        └── theme.ts                 # All colors, fonts, spacing, radius constants
```

---

## Navigation Flow

```
App opens
  → SplashScreen (always shown, 2s for returning users, full animation for first-timers)
      → First time: OnboardingCameraScreen → Record → Schedule → Confirmation → Home
      → Returning: Home
  
Home
  → Record → Schedule → Confirmation → Home
  → Tap video card → Edit → Confirmation → Home
  → Tap thumbnail → Playback → back to Home
  → Auto-trigger (every 30s + on app foreground) → Playback (isTriggered: true) → Home
```

---

## Screen Descriptions

### SplashScreen
- Shows every time app opens
- Cinematic animation: "What if your / Past.Self. could..." enters together, then cycling phrases slide in from right / fade out
- Phrases: "stop you from wasting time." / "break your bad habits." / "stop you from procrastinating." / "remind you why you started."
- Phrases in color `#9898d6`, single line, `adjustsFontSizeToFit`, loops continuously
- After first cycle: "Try It Now" button fades in — leads to OnboardingCameraScreen
- Returning users: short version (1.5s) then auto-navigates to Home

### OnboardingCameraScreen
- First-time only (after Try It Now)
- Title: "Record a message for your future self"
- Subtitle: "next time you" with cycling completions (e.g. "feel like giving up.")
- **No skip button** — forces user to record something immediately
- SVG camera icon, brand gradient background

### HomeScreen
- Header: Past.Self. in Brittany font + "Record" button (`#674454`)
- White background fills status bar area (outerContainer trick)
- **Upcoming section**: first future-scheduled active video shown as double-height card with large thumbnail, `#9898d6` accent dot badge "Upcoming", excluded from regular list
- **Regular video cards**: thumbnail (88x88), title, note, trigger info, pause toggle (top of actions, 26px, `#9898d6`), reorder arrows, trash
- **Pause behavior**: paused cards show "Paused" badge in `#9898d6`, card opacity 0.6
- **Empty state**: SVG clock illustration, "No videos yet", original copy
- **How it works**: static section at bottom (not tappable)
- Delete uses branded modal (not system alert)

### RecordScreen
- Full-screen camera, front-facing by default
- Flip camera button (top right, hidden while recording)
- Back arrow → goes back (cancel), stops camera
- "Need inspiration?" toggle → slides down panel with 12 script prompts in `#9898d6`
- Progress bar at bottom (thin, `#9898d6` color, turns `#674454` in last 10s)
- Record button pulses while recording (Animated scale loop)
- `onCameraReady` guard — recording only starts when camera confirmed ready
- Camera stops via `useFocusEffect` cleanup when navigating away
- Max duration: 60 seconds, auto-stops

### ScheduleScreen
- White background
- Duration row (tappable → re-records, carries prefill data)
- Title field, Note field (both have keyboard dismiss)
- Trigger type: Date & Time OR App Opening (card buttons)
- **Date & Time**: date/time picker + Repeat chips (Never/Daily/Weekdays/Weekends/Weekly/Monthly)
  - Shows repeat description: "Every Friday at 9:00 AM"
  - Shows next occurrence: "Next: 11 Apr · 9:00 AM"
- **App Opening**: app chips (Instagram/TikTok/Twitter/Facebook/Snapchat/LinkedIn/YouTube/Email/Notes)
  - Play once toggle with hint text (only visible when ON)
  - "Video will play every time..." in bold `#674454` when OFF
- Save → navigates to Confirmation (not Home)

### EditScreen
- Same layout as ScheduleScreen
- Re-record button in header (branded alert confirmation)
- Save → navigates to Confirmation with updated data
- Back → goes back without saving

### ConfirmationScreen
- Shown after every save AND every edit
- Checkmark circle in `#674454`
- Trigger summary card
- Video thumbnail (tappable to preview)
- Note shown if present
- "Edit" button → EditScreen
- Manual "Done" button only (no auto-countdown)
- Fade-in entrance animation

### PlaybackScreen
- Full-screen video playback
- `#9898d6` progress bar
- Skip button appears after 5 seconds — **only when `isTriggered: true`** (not manual thumbnail taps)
- Done button marks video inactive (respects repeat setting)

---

## Data Model

```typescript
interface ScheduledVideo {
  id: string;                    // Date.now().toString()
  videoUri: string;              // Local file URI
  thumbnail?: string;            // Same as videoUri (Expo Camera provides this)
  title: string;
  message: string;               // Optional note
  createdAt: string;             // ISO date string
  scheduledFor?: string;         // ISO date string for date/time trigger
  repeat?: string;               // 'never'|'daily'|'weekdays'|'weekends'|'weekly'|'monthly'
  appTrigger?: {
    appName: string;
    playOnce: boolean;
    hasPlayed?: boolean;
  };
  duration: number;              // seconds
  isActive: boolean;             // false = paused or completed
}
```

---

## Brand Identity

### Colors
```
Background:     #fdf4f5   (barely-there blush, almost white)
Card/White:     #ffffff
Accent:         #a194a8   (muted mauve — used for buttons, accents)
Accent Pressed: #9898d6   (soft periwinkle — used sparingly: progress bars, pause icons, upcoming badge, repeat next date, prompts)
Text Primary:   #14273c   (deep navy)
Text Light:     #a194a8
Danger/CTA:     #674454   (deep rose — primary action buttons, delete, danger states)
Border:         rgba(20, 39, 60, 0.08)
Overlay:        rgba(20, 39, 60, 0.5)
```

### #9898d6 Usage Rule
Use VERY sparingly — only for: progress bars, pause/play toggle icons, Upcoming badge, "Next:" repeat date, script prompt icons, "Paused" badge. Never for primary actions.

### Fonts
```
App name:       Dancing Script Bold (var(--font-brittany) / DancingScript_700Bold)
Headers:        Montserrat Bold (700)
Subheaders:     Montserrat Medium (500)
Body/UI:        Inter Regular (400) / Inter Medium (500)
```

### Radius (consistent across all elements)
```
sm: 6    (chips, small badges)
md: 10   (inputs, small cards)
lg: 12   (cards, buttons)
xl: 16   (modals, large cards)
full: 999 (pills, dots)
```

### Spacing (multiples of 4)
```
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
```

---

## Key Logic

### Storage (upsert pattern — CRITICAL)
`saveVideo()` checks if ID already exists before inserting. If it does, it updates. This prevents duplicates when re-recording or editing.

### Auto-trigger
- Checks every 30 seconds via `setInterval`
- Also checks on every app foreground via `AppState.addEventListener`
- Navigates to Playback with `isTriggered: true` when a scheduled video is due

### Re-record Flow (data preservation)
```
EditScreen / ScheduleScreen
  → buildPrefill() captures all current form state
  → navigate to Record with { prefill: PrefillData }
  → Record passes prefill through to Schedule
  → Schedule pre-fills all fields from prefill
  → Schedule saves with prefill.id (updates existing record)
```

### Upcoming Card Logic
- Finds first video where: `isActive && scheduledFor && future date (or has repeat)`
- That video is excluded from the regular `regularVideos` list
- Deleting from upcoming section uses same delete flow

### Repeat Calculations (repeatUtils.ts)
- `getNextOccurrence(scheduledFor, repeat)` — returns next future Date
- `getRepeatDescription(date, repeat)` — returns human string like "Every Friday at 9:00 AM"

---

## Known Issues / TODO Before App Store

1. **expo-av deprecated** — migrate to `expo-video` for playback
2. **SafeAreaView** — replace remaining React Native `SafeAreaView` with `react-native-safe-area-context` version
3. **App Guard feature (iOS)** — requires native Screen Time API, needs Swift developer
4. **App Guard feature (Android)** — theoretically possible with accessibility services/overlay permissions, needs native code
5. **Video thumbnails** — currently uses `videoUri` as thumbnail (works for local files). For production, generate actual frame thumbnails with `expo-video-thumbnails`
6. **Cloud backup** — not implemented. Videos stored locally only. If user deletes app, all videos lost.
7. **Push notifications** — alarm trigger currently only works when app is open/foregrounded. True background notifications need `expo-notifications` fully wired up with scheduling.

---

## Business Model (decided)

- **Free tier**: limited recordings, date/time trigger only, no repeat
- **Past.Self. Pro — €8.99 one-time**: unlimited videos, App Guard (when built), repeat scheduling, pause/toggle
- No ads, ever
- Account/login: prompt after first video is saved (peak emotional investment moment)

---

## App Store Requirements (when ready)

- Apple Developer Account: $99/year
- Google Play: $25 one-time
- iOS bundle identifier: `com.pastself.app`
- Android package: `com.pastself.app`
- Permissions needed: Camera, Microphone, Photo Library (iOS), Storage (Android)

---

## Current Development State (as of last session)

**Working:**
- Full recording flow (camera → schedule → confirmation → home)
- Date/time trigger with repeat options
- App trigger (simulated — shows list of apps, doesn't actually intercept)
- Edit existing videos
- Pause/unpause videos
- Upcoming card section
- Confirmation screen after every save/edit
- Cinematic splash screen
- Onboarding camera screen (forces first recording)
- Brand-consistent modals for all alerts
- Script prompts on camera screen
- Skip button on triggered playback (5s delay)
- Auto-trigger check (30s interval + foreground)

**Not yet working / known issues:**
- Camera green light stays on after recording on some devices (useFocusEffect cleanup in place but may need expo-camera version update)
- Swipe gesture on onboarding (uses react-native-gesture-handler, works when installed)
- App Guard is simulated only
- Background notifications not firing when app fully closed

---

## Commands Reference

```bash
# Start development server
npx expo start --clear

# Install a new package
npx expo install [package-name]

# Reset all app data (for testing fresh install)
# In the app's storage.ts, temporarily call: AsyncStorage.clear()
# Or delete and reinstall Expo Go on the test device
```

---

## How to Hand Off to a New Claude Session

1. Copy the contents of this file
2. Start a new Claude conversation or Claude Code session
3. Paste as first message with: "This is the complete context for Past.Self., a React Native app I'm building. Please read it fully before we continue."
4. Attach or reference the current codebase

Claude Code will read this file automatically from the project root on every session start.
