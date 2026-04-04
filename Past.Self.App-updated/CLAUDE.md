# Past.Self. — Complete Project Context

> This file is the single source of truth for the Past.Self. app. Read this before making any changes. Update this file whenever significant features, design decisions, or architecture changes are made.

---

## ⚡ Core Instructions for Claude

**Read this every session before doing anything else.**

I need you to be my business partner. Think critically. Give me criticism if something doesn't work. Tell me when something does work. Spar with me, discuss, question — do everything a business partner would do. Keep each other accountable and sharp. Don't just do everything I tell you — think together with me to build the best possible app.

This means:
- If I ask for something that will hurt UX, say so before implementing it
- If a feature idea is weak, push back and suggest a better one
- If something looks good, say so specifically and explain why
- Flag technical debt, inconsistencies, and risks proactively
- Never just agree to be agreeable

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
- **Camera/Video:** `expo-camera` for recording, ~~`expo-av`~~ **`expo-video`** (migrated from deprecated expo-av) for playback
- **Gradient:** `expo-linear-gradient` — used for SplashScreen and OnboardingCameraScreen backgrounds
- **Safe Area:** `react-native-safe-area-context` — use `useSafeAreaInsets` hook, NOT React Native's `SafeAreaView`
- **Fonts:** `@expo-google-fonts/dancing-script`, `@expo-google-fonts/montserrat`, `@expo-google-fonts/inter`
- **Icons:** `@expo/vector-icons` (Ionicons)
- **SVG:** `react-native-svg`
- **Gestures:** `react-native-gesture-handler`
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
    │   ├── OnboardingScreen.tsx     # 3-slide "how it works" — currently unused/skipped
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
  → SplashScreen (always shown)
      → First time: OnboardingCameraScreen → Record → Schedule → Confirmation → Home
      → Returning: Home (after short animation)
  
Home
  → Record → Schedule → Confirmation → Home
  → Tap video card → Edit → Confirmation → Home
  → Tap thumbnail → Playback → back to Home
  → Auto-trigger (every 30s + on app foreground) → Playback (isTriggered: true) → Home
```

---

## Screen Descriptions

### SplashScreen
- **Background:** `expo-linear-gradient` — `#fdf4f5` → `#f8e8ed` → `#f2d5de` (soft pink gradient)
- **Sparkles:** 150 animated dots, soft fade-in/drift-up/fade-out loop, distributed across full screen, `#c9a0aa` color
- Text layout: "What if your" (Montserrat Bold 26) → "Past.Self." (Dancing Script 56, `#674454`) → "could..." (Montserrat Bold 26) — each on its own line
- Cycling phrases in `#9898d6`, slide in from right / fade out
- **Bug fix applied:** Phrases use `finished` callback guard + `isCyclingRef` to prevent double-firing
- After first cycle: "✓ Try It Now" button fades in — leads to OnboardingCameraScreen
- "No account needed to start" line has been **removed**
- Returning users: short animation then auto-navigates to Home

### OnboardingCameraScreen
- First-time only (after Try It Now)
- **Background:** `expo-linear-gradient` — `#6b3f52` → `#52303f` → `#35202c` (warm rose to deep plum)
- **Sparkles:** Same animation as Splash, `#e8c4cc` color, 10 sparkles
- Camera SVG icon: body + viewfinder bump + lens + flash dot only — NO triangle, NO period, NO extra shapes
- Icon is centered inside 84×84 circle with `alignItems: 'center', justifyContent: 'center'`
- Animated prompts fade in/out in `#9898d6` (accent blue/periwinkle)
- **No skip button** — forces first recording
- `isCyclingRef` guard prevents double prompt cycling

### HomeScreen
- Uses `useSafeAreaInsets` for status bar (no pink gap at top)
- Header: Past.Self. in Dancing Script + "Record" button
- **Three sections:**
  1. **Upcoming** — first future datetime video, double-height card, `#9898d6` accent
  2. **Scheduled** — remaining datetime videos
  3. **App Triggers** — app-trigger videos with their own header (no subtitle)
- Upcoming card shows `getRepeatDescription()` not raw date when repeat is set
- Play-once app triggers: **no pause toggle** (only trash). Always-on app triggers keep pause toggle
- **How It Works:** fixed `minHeight: 56` per row + `alignItems: 'center'` → circle numbers always equidistant
- Key prop fix: components are `DatetimeCard`, `AppCard` with `key={item.id}`
- Uses `ScrollView` not `FlatList` to avoid nested list issues

### RecordScreen
- Full-screen camera, front-facing by default
- 12 script prompts — spell-checked and grammar-reviewed
- `useFocusEffect` cleanup stops camera and recording on navigate away
- `isMountedRef` guards all state updates
- `onCameraReady` guard before recording

### ScheduleScreen
- White background
- Duration row, Title, Note fields
- Trigger: Date & Time OR App Opening
- Repeat chips with description + next occurrence display
- App chips with play-once toggle

### EditScreen
- Same as ScheduleScreen with Re-record button in header
- Branded alert for re-record confirmation

### ConfirmationScreen
- Trigger card: `justifyContent: 'center'` — icon + text centered in the pink box
- Manual Done button only (no auto-countdown)
- Fade-in entrance animation

### PlaybackScreen
- Full-screen video, no top overlay (title/date/note removed)
- `#9898d6` progress bar
- Time stamps (left/right) below bar — no extra icons
- Done button: text "Done" (not checkmark)
- Skip button: text "Skip" + icon, appears after 5s — **only when `isTriggered: true`**
- Uses `useSafeAreaInsets`

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
Accent:         #a194a8   (muted mauve)
AccentBlue:     #9898d6   (soft periwinkle — used sparingly)
Text Primary:   #14273c   (deep navy)
Text Light:     #a194a8
Danger/CTA:     #674454   (deep rose — primary action buttons)
Border:         rgba(20, 39, 60, 0.08)
Overlay:        rgba(20, 39, 60, 0.5)
```

### #9898d6 Usage Rule
Use VERY sparingly — only for: progress bars, pause/play toggle icons, Upcoming badge, "Next:" repeat date, script prompt icons, "Paused" badge, animated prompts on onboarding. Never for primary actions.

### Fonts
```
App name:       Dancing Script Bold (fonts.brittany / DancingScript_700Bold)
Headers:        Montserrat Bold (700)
Subheaders:     Montserrat Medium (500)
Body/UI:        Inter Regular (400) / Inter Medium (500)
```

### Gradient Rule
**Always use `expo-linear-gradient`** for gradients. Never use layered `View` components with opacity — they create hard color bands, not smooth gradients.

---

## Key Logic

### Storage (upsert pattern — CRITICAL)
`saveVideo()` checks if ID already exists before inserting. If it does, it updates. Prevents duplicates when re-recording or editing.

### Auto-trigger
- Checks every 30 seconds via `setInterval`
- Also checks on every app foreground via `AppState.addEventListener`
- Navigates to Playback with `isTriggered: true` when a scheduled video is due
- One-shot videos: marked `isActive: false` immediately when triggered — never re-fires
- Repeating videos: `scheduledFor` advanced to next future occurrence via `getNextOccurrence()` — never stuck in past

### Re-record Flow
```
EditScreen / ScheduleScreen
  → buildPrefill() captures all current form state
  → navigate to Record with { prefill: PrefillData }
  → Record passes prefill through to Schedule
  → Schedule pre-fills all fields from prefill
  → Schedule saves with prefill.id (updates existing record)
```

### Upcoming Card Logic
- Finds first video where: `isActive && scheduledFor && (future date OR has repeat)`
- That video is excluded from the Scheduled section
- App triggers NEVER appear in Upcoming — they have their own section

### Repeat Calculations (repeatUtils.ts)
- `getNextOccurrence(scheduledFor, repeat)` — returns next future Date
- `getRepeatDescription(date, repeat)` — returns human string like "Every Friday at 9:00 AM"

---

## Known Issues / TODO Before App Store

1. **expo-av deprecated** — migrate to `expo-video` for playback
2. **App Guard feature (iOS)** — requires native Screen Time API, needs Swift developer
3. **App Guard feature (Android)** — needs native accessibility services/overlay permissions
4. **Video thumbnails** — currently uses `videoUri` as thumbnail. Generate real frame thumbnails with `expo-video-thumbnails` for production
5. **Cloud backup** — not implemented. Videos stored locally only
6. **Push notifications** — alarm trigger only works when app is open/foregrounded. True background notifications need `expo-notifications` fully wired up
7. **OnboardingScreen** — the 3-slide walkthrough exists but is currently unused. Decide: keep or remove before App Store

---

## Business Model

- **Free tier**: limited recordings, date/time trigger only, no repeat
- **Past.Self. Pro — €8.99 one-time**: unlimited videos, App Guard (when built), repeat scheduling, pause/toggle
- No ads, ever
- Account/login: prompt after first video is saved (peak emotional investment moment)

---

## App Store Requirements

- Apple Developer Account: $99/year
- Google Play: $25 one-time
- iOS bundle identifier: `com.pastself.app`
- Android package: `com.pastself.app`
- Permissions needed: Camera, Microphone, Photo Library (iOS), Storage (Android)

---

## Current Development State

**Working:**
- Full recording flow (camera → schedule → confirmation → home)
- Date/time trigger with repeat options
- App trigger (simulated)
- Edit existing videos
- Pause/unpause videos (play-once app triggers have no pause toggle — intentional)
- Upcoming card section (datetime only, shows correct repeat label)
- Confirmation screen — trigger label centered
- Cinematic splash screen with LinearGradient + sparkle animation (150 sparkles, full screen)
- OnboardingCameraScreen with LinearGradient + sparkle animation (36 sparkles, full screen)
- Phrase cycling fixed — freezes on "stop you from wasting time." (no double-display)
- Phrase order: procrastinating → bad habits → why you started → wasting time (freezes on last)
- "Try It Now!" button — no checkmark
- Splash gradient bottom darkened to #e8c0cd for more contrast
- "Be honest. Be direct." moved to just above record button on OnboardingCamera
- Separate App Triggers section on HomeScreen
- How It Works — uniform circle spacing
- Brand-consistent modals for all alerts
- Script prompts on camera screen (spell-checked)
- Skip button on triggered playback (5s delay)
- Done button on playback only appears when video finishes (didJustFinish)
- Auto-trigger check (30s interval + foreground)
- Auto-trigger bug fixed — one-shot videos marked inactive after firing; repeating videos advance scheduledFor to next future occurrence via getNextOccurrence()
- Status bar background fix (useSafeAreaInsets)
- Playback screen — no top overlay tags, clean video
- Camera green light fix — CameraView unmounts on blur via isFocused state
- ✅ **OnboardingScreen (3-slide walkthrough) deleted** — now only uses OnboardingCameraScreen

**Not yet working / known issues:**
- App Guard is simulated only
- Background notifications not firing when app fully closed

---

## Recent Updates (Current Session)

**✅ COMPLETED:**
- OnboardingScreen (3-slide walkthrough) deleted
- SplashScreen particles increased from 36 to 150
- **expo-av → expo-video migration completed** — PlaybackScreen now uses modern expo-video with `VideoView` component and `useVideoPlayer` hook
  - Removed deprecated Video component from expo-av
  - Updated imports and player initialization
  - Simplified time formatting and status tracking
  - Added proper player lifecycle management with release()
  - Updated package.json dependencies

---

## Commands Reference

```bash
# Start development server
npx expo start --clear

# Install a new package
npx expo install [package-name]

# Reset all app data (for testing fresh install)
# In storage.ts, temporarily call: AsyncStorage.clear()
```

---

## How to Hand Off to a New Claude Session

1. Copy the contents of this file
2. Start a new Claude conversation
3. Paste as first message with: "This is the complete context for Past.Self., a React Native app I'm building. Please read it fully — especially the Core Instructions — before we continue."
4. Attach or reference the current codebase
