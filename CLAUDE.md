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

**GitHub repo:** https://github.com/OmnifySolutions/Past.Self.App (public)

### GitHub access tip
Claude can fetch files directly when given a **raw** GitHub URL:
- ✅ `https://raw.githubusercontent.com/OmnifySolutions/Past.Self.App/main/App.tsx`
- ❌ `https://github.com/OmnifySolutions/Past.Self.App/blob/main/App.tsx` — blocked by robots.txt

To get a raw URL: open the file on GitHub → click "Raw" → copy that URL and paste it into chat.

---

## App Overview

**Name:** Past.Self. (with periods — always written exactly like this)
**Tagline:** Messages from your past to your future
**Concept:** Users record short video messages to their future selves. Each video is triggered to play at a specific moment — either at a scheduled date/time (like an alarm) or when the user opens a specific app (e.g. Instagram). The purpose is motivation, accountability, habit-breaking, reminders, and self-persuasion.

**Why it works psychologically:** Hearing your own voice and seeing your own face creates a stronger emotional response than any external notification or quote. Your past self becomes your coach.

**Original vision / lock screen intent:** The founding idea was intercepting the user *before* they unlock their phone — your past self plays before you can get to Instagram or anything else. This is currently classified under "App Guard" in the TODO. App Guard is NOT just an app-open trigger — it's meant to eventually intercept at the OS level (iOS: Screen Time API, Android: accessibility service). Keep this intent in mind for all UX and feature decisions.

---

## Tech Stack

- **Framework:** React Native with Expo (SDK 54)
- **Language:** TypeScript ~5.9.2
- **Navigation:** @react-navigation/native + @react-navigation/native-stack only. @react-navigation/stack is NOT installed.
- **Storage:** @react-native-async-storage/async-storage
- **Camera/Video recording:** expo-camera
- **Video playback:** expo-video (expo-av is NOT installed — removed, deprecated)
  - useVideoPlayer hook — must be called at TOP LEVEL only, never inside useEffect, never conditionally
  - Events use useEventListener imported from 'expo' (NOT from 'expo-video')
  - useEventListener(player, 'timeUpdate', callback) for progress tracking
  - useEventListener(player, 'playToEnd', callback) for end detection
  - Set player.timeUpdateEventInterval = 0.5 in the player init callback
- **File system:** expo-file-system/legacy (use /legacy import — base API is deprecated)
- **Thumbnails:** expo-video-thumbnails — generates real frames from permanent video file at save time
  - ⚠️ May not be in package.json yet — if missing, run: `npx expo install expo-video-thumbnails`
- **Unique IDs:** expo-crypto — use Crypto.randomUUID() for video IDs, never Date.now()
- **Gradient:** expo-linear-gradient
- **Safe Area:** react-native-safe-area-context — use useSafeAreaInsets() hook EVERYWHERE. NEVER use React Native's SafeAreaView — causes pink status bar gap on iOS.
- **Fonts:** @expo-google-fonts/dancing-script, @expo-google-fonts/montserrat, @expo-google-fonts/inter
- **Icons:** @expo/vector-icons (Ionicons)
- **SVG:** react-native-svg
- **Gestures:** react-native-gesture-handler
- **Date Picker:** @react-native-community/datetimepicker

### Removed packages — do NOT re-add
- expo-av — replaced by expo-video
- expo-notifications — not yet wired up
- expo-image-picker — not used
- expo-media-library — not used
- @react-navigation/stack — native-stack is used instead

---

## Project Structure

```
PastSelfApp/
├── App.tsx                    # Root navigation, font loading, trigger interval
├── app.json                   # Expo config — plugins: expo-camera, expo-video only
├── CLAUDE.md                  # This file
└── src/
    ├── screens/
    │   ├── SplashScreen.tsx
    │   ├── OnboardingCameraScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── RecordScreen.tsx
    │   ├── ScheduleScreen.tsx
    │   ├── EditScreen.tsx
    │   ├── PlaybackScreen.tsx
    │   └── ConfirmationScreen.tsx
    ├── components/
    │   └── BrandAlert.tsx     # Only modal component. BrandModal.tsx deleted.
    ├── utils/
    │   ├── storage.ts
    │   └── repeatUtils.ts
    ├── types/
    │   └── video.ts           # ScheduledVideo + RepeatOption union type
    └── styles/
        └── theme.ts
```

**Deleted files — do not recreate:**
- src/components/BrandModal.tsx — was dead code
- src/screens/OnboardingScreen.tsx — 3-slide walkthrough, deliberately cut. Reason: OnboardingCamera IS the onboarding. A 3-slide walkthrough before the camera creates friction at exactly the wrong moment — the emotional hook is picking up the phone and recording immediately. The slides added zero value and delayed the "aha" moment.

---

## Key Product Decisions (with reasoning)

### €8.99 one-time pricing — intentional
No subscription. One-time purchase signals trust. The target user is someone making a personal, emotional commitment — not someone who wants another monthly bill. Subscriptions also increase churn anxiety. Revisit only if monetisation data proves otherwise.

### No ads — permanent
Not a toggle. Not a "for now" decision. Ads would destroy the emotional tone of the app. Non-negotiable.

### Login after first save — deferred but important
Login prompt triggers after the first video is saved — peak emotional investment. Not after launch, not on cold open. Deferred because it needs backend/cloud infrastructure first.

---

## Navigation Flow

```
App opens
  → SplashScreen (always shown)
      → First time: OnboardingCameraScreen → Record → Schedule → Confirmation → Home
      → Returning: Home (after short animation)

Home
  → Record → Schedule → Confirmation → Home (stack reset)
  → Tap card → Edit → Confirmation → Home (stack reset)
  → Tap thumbnail → Playback (isTriggered: false) → back to Home
  → Auto-trigger → Playback (isTriggered: true) → Home
```

**CRITICAL navigation rules:**
- ConfirmationScreen Done: calls setOnboarded() then CommonActions.reset({ routes: [{ name: 'Home' }] }) — wipes the stack cleanly from both onboarding and normal flows
- ScheduleScreen Re-record: navigation.replace('Record', { prefill }) — removes Schedule from stack
- EditScreen back: navigation.goBack()
- Never use navigation.navigate('Home') from Confirmation — pushes a duplicate Home

---

## Screen Descriptions

### SplashScreen
- Background: LinearGradient #fdf4f5 → #f8e8ed → #e8c0cd
- Sparkles: ~550 animated white dots, randomized delays and loop gaps
- Header: "What if your" / "Past.Self." (Dancing Script 56, #674454) / "could..."
- Cycling phrases in #9898d6: procrastinating → bad habits → why you started → wasting time
- Phrase animation: slide in (320ms) → hold (1400ms) → fade out (280ms). Next starts as current fades.
- Last phrase stays; "Try It Now!" button fades in with pulse + white glow
- Returning users: short animation → navigation.replace('Home')

### OnboardingCameraScreen
- Background: LinearGradient #6b3f52 → #52303f → #35202c
- Sparkles: 60 dots, #e8c4cc color, delays 0–6000ms, randomized loop gaps
- Large camera SVG icon (96px), no circle wrapper, centered via flex justifyContent/alignItems center. viewBox adjusted so lens is centered.
- Animated prompts cycle in #9898d6
- "Be honest. Be direct. Your future self is listening." above record button
- No skip button — forces first recording

### RecordScreen
- Full-screen camera, front-facing by default
- useSafeAreaInsets() for header and controls — NOT SafeAreaView
- Thought bubble: frosted pill (rgba(255,255,255,0.15)), fonts.inter (NOT bold), fontSize: 14
  - position: absolute, top: 128, left: 70, right: 70
  - borderWidth: 1, borderColor: rgba(255,255,255,0.25)
  - Text: "What would you like your future self to know?"
  - Pulsates: scale 1 → 1.09 → 1 over 1.7s loop. Hidden while recording.
- 12 spell-checked script prompts
- useFocusEffect cleanup: stops camera + recording on navigate away
- isMountedRef guards all state updates

### ScheduleScreen
- useSafeAreaInsets() — NOT SafeAreaView
- CRITICAL video file handling: always delete existing file before copying new one (re-record safety)
- Video ID: Crypto.randomUUID() — NOT Date.now()
- Re-record: navigation.replace('Record', { prefill }) — not navigate
- Thumbnail: expo-video-thumbnails at time: 500, from permanent video URI
- App Trigger section shows "Coming Soon" banner

### EditScreen
- useSafeAreaInsets() — NOT SafeAreaView
- RepeatOption typed state for repeat field
- Re-record via BrandAlert confirmation
- App Trigger section shows "Coming Soon" banner

### PlaybackScreen
- Two-component pattern: PlaybackScreen (outer loader) + PlayerView (inner, mounts only with real URI)
- useVideoPlayer at top level of PlayerView — never conditional
- Import useEventListener from 'expo' not 'expo-video'
- Done button: always visible when isTriggered: false; only after video finishes when isTriggered: true
- Skip button: appears after 5s, only when isTriggered: true
- handleDone: only updates storage for appTrigger.playOnce case. Datetime one-shots already marked inactive by checkScheduledVideos — do NOT double-write isActive: false here.
- No BrandAlert — was removed (dead code)

### HomeScreen
- useSafeAreaInsets() for paddingTop
- Three sections: Upcoming (hero card), Scheduled, App Triggers
- Empty state: fills full screen, How It Works visible without scrolling
- CRITICAL: All sub-components defined at module level outside HomeScreen — NEVER inline. Inline = remount every render = image flicker + animation resets.

#### Swipe-to-delete (SwipeableCard)
- ROOT CAUSE OF DELETE ZONE PEEK: TouchableOpacity activeOpacity dimmed the card on press,
  making the red zone behind it visible. Fixed permanently with:
  1. swipeContainer backgroundColor = colors.danger (container IS the red zone)
  2. deleteZoneCover view slides WITH the card on its right edge — covers zone at rest,
     reveals it as card slides left
  3. All card TouchableOpacity use activeOpacity={1} — card never dims on press
  4. AlarmToggle uses activeOpacity={1} — toggle never dims on press
- offsetX ref tracks committed position
- currentX ref (via listener) tracks live position — used on grant to avoid jump on interrupted animations
- onMoveShouldSetPanResponder: dx > 10 AND dx > dy * 2 — prevents vertical taps triggering swipe
- Snap: currentX < -52 or vx < -0.5
- Delete zone stays visible while BrandAlert confirmation is open. Scrolling the list closes/resets the delete zone.

#### Drag-to-reorder (DraggableList)
- ROOT CAUSE OF DRAG FAILURE: Long-press timer inside PanResponder was cancelled by iOS
  sending move events within ~50ms even for stationary fingers (digitiser noise).
- FIX: Use Pressable onLongPress (OS-level, reliable) for activation. Shared PanResponder
  handles movement only AFTER isDraggingRef is set. The two are fully decoupled.
- delayLongPress={400} on Pressable
- No 3-dot handle — long-press anywhere on the card activates drag (users are smart enough)
- onMoveShouldSetPanResponder + onMoveShouldSetPanResponderCapture both return isDraggingRef.current
- Grabbed card: scale 1.05 spring + shadow elevation lift
- Hover feedback: target slot card plays 3-step shake (±4px)
- During drag: card renders WITHOUT SwipeableCard wrapper — prevents delete zone bleed-through
- orderedIdsRef keeps live order for PanResponder closures without stale captures
- onScrollEnable(false) during drag, restored on release/terminate

#### How It Works
- alignSelf: 'center', width: '88%', marginBottom: spacing.lg — NOT full width, has bottom margin

### ConfirmationScreen
- useSafeAreaInsets() — NOT SafeAreaView (was using SafeAreaView from react-native, now fixed)
- Fade-in entrance animation
- Done: calls setOnboarded() then CommonActions.reset({ routes: [{ name: 'Home' }] })
- Tap thumbnail → Playback (isTriggered: false)
- Trigger card: icon + text centered with justifyContent: 'center'

---

## Data Model

```typescript
// RepeatOption is a union type — NEVER use plain string
type RepeatOption = 'never' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';

interface ScheduledVideo {
  id: string;            // Crypto.randomUUID() — never Date.now()
  videoUri: string;      // Permanent: documentDirectory/videos/{id}.mp4
  thumbnail?: string;    // Permanent: documentDirectory/thumbnails/{id}.jpg
  title: string;
  message: string;
  createdAt: string;     // ISO date string
  scheduledFor?: string; // ISO string — datetime trigger only
  repeat?: RepeatOption; // typed union, not string
  appTrigger?: {
    appName: string;
    playOnce: boolean;
    hasPlayed?: boolean;
  };
  duration: number;      // seconds
  isActive: boolean;     // trigger system only — marks done/expired. NEVER for user pause.
  isPaused?: boolean;    // user toggle only — paused videos skip all trigger checks
}

// PrefillData — re-record flow: Edit/Schedule → Record → Schedule
interface PrefillData {
  id?: string;
  title?: string;
  message?: string;
  triggerType?: 'datetime' | 'app';
  scheduledFor?: string;
  repeat?: RepeatOption; // typed union — NOT string
  appName?: string;
  playOnce?: boolean;
  createdAt?: string;
}
```

---

## Brand Identity

### Colors

```
Background:   #fdf4f5   (barely-there blush)
Card/White:   #ffffff
Accent:       #a194a8   (muted mauve)
AccentBlue:   #9898d6   (soft periwinkle — use sparingly)
Text Primary: #14273c   (deep navy)
Text Light:   #a194a8
Danger/CTA:   #674454   (deep rose — primary action buttons)
Border:       rgba(20, 39, 60, 0.08)
Overlay:      rgba(20, 39, 60, 0.5)
```

### #9898d6 Usage Rule

Use VERY sparingly: progress bars, Upcoming badge dot, "Next:" date text, script prompt icons, "Paused" badge text, animated onboarding prompts. Never for primary actions or toggles.

### Fonts

```
App name:    Dancing Script Bold (fonts.brittany)
Headers:     Montserrat Bold 700 (fonts.montserratBold)
Subheaders:  Montserrat Medium 500 (fonts.montserratMedium)
Body/UI:     Inter Regular 400 (fonts.inter) / Inter Medium 500 (fonts.interMedium)
```

---

## Key Logic

### Auto-trigger Architecture

- checkScheduledVideos imported at top level in App.tsx
- NOT called on nav mount / onLayoutRootView. Called in HomeScreen's useFocusEffect — fires only when user is on Home, never during Splash animation.
- Also runs: 30s interval + AppState foreground (both in App.tsx)
- navigationRef.current?.isReady() guard before navigate
- One-shot datetime: marked isActive: false immediately on trigger
- Repeating datetime: scheduledFor advanced to next future occurrence
- Paused videos skipped entirely

### Onboarding Completion (CRITICAL)

setOnboarded() from storage.ts MUST be called in ConfirmationScreen.handleDone before navigating. If missing: every session treats user as first-time → loops back to OnboardingCamera.

### Splash isFirstTime (CRITICAL)

App.tsx waits for BOTH font loading AND isOnboarded() to resolve before rendering the navigator.
isFirst state starts as null — the navigator is NOT rendered until isFirst is a real boolean.
This prevents initialParams from firing before the async check completes (race condition that
caused returning users to always see the first-time splash).

```typescript
// CORRECT pattern in App.tsx
const [isFirst, setIsFirst] = useState<boolean | null>(null);
if (!appReady || isFirst === null) return null; // hold render until resolved
```

### Video Storage

1. permanentDir = FileSystem.documentDirectory + 'videos/'
2. If file exists at target path: deleteAsync first (re-record safety)
3. copyAsync to permanent path
4. expo-video-thumbnails at time: 500 from permanent URI
5. Copy thumbnail to documentDirectory/thumbnails/{id}.jpg
6. Save permanent URIs to AsyncStorage — never temp camera URIs
7. Import: expo-file-system/legacy

### isPaused vs isActive

- isActive: trigger system. false = played/expired. Never set by user.
- isPaused: user toggle. true = skipped in trigger checks. Does not affect isActive.

### PlaybackScreen Done Logic

handleDone only writes for appTrigger.playOnce case. Datetime one-shots already handled by checkScheduledVideos. No double-write.

### RepeatOption

Always type repeat fields as RepeatOption, never string. Defined in src/types/video.ts. All repeatUtils.ts functions accept RepeatOption.

### Monthly Repeat

Clamps to last day of month: detects overflow via next.getDate() !== originalDay, rolls back with setDate(0). Safety counter: 60 iterations.

---

## app.json Plugins

Only these two:
```json
"plugins": ["expo-camera", "expo-video"]
```

---

## Current Development State

### Working
- Full recording flow
- Permanent video + thumbnail storage (randomUUID IDs)
- expo-video playback (two-component pattern, correct event API)
- Done / Skip button logic
- Date/time trigger + RepeatOption typed repeat (monthly drift fixed)
- App trigger: simulated, "Coming Soon" banners on Schedule + Edit screens
- Edit + re-record (replace() cleans stack)
- Auto-trigger: HomeScreen focus + 30s + foreground (not during Splash)
- Onboarding: setOnboarded() called → no loop back
- CommonActions.reset() navigation clears full stack correctly
- How It Works: 88% width, centered, marginBottom so it doesn't hug bottom
- navigationRef fully typed
- RepeatOption union type everywhere
- useSafeAreaInsets on all screens (ConfirmationScreen fixed — was using SafeAreaView)
- Dead code cleaned: BrandModal, OnboardingScreen, expo-av, expo-notifications, expo-image-picker, expo-media-library, @react-navigation/stack
- app.json fixed: broken plugins array repaired, expo-av ghost removed
- SwipeableCard delete zone peek fixed: cover view + activeOpacity={1} on all cards
- DraggableList drag activation fixed: Pressable onLongPress replaces broken PanResponder timer

### Known Issues / Pending
- Splash isFirstTime: App.tsx fix is in place (null guard + async resolution before render).
  However stale onboarding flag in AsyncStorage from previous test runs may cause returning
  user behaviour until storage is cleared. Fix: temporarily add AsyncStorage.clear() to
  prepare() function, run once, then remove. Do NOT leave in production.
- Multi-video trigger queue: if two or more videos are past-due simultaneously, only one triggers per check cycle. The second fires 30s later. Root cause: the trigger loop exits after the first triggered video to avoid navigating twice. Fix requires HomeScreen context to implement safely — not yet attempted. Low severity.

### TODO Before App Store
- App Guard native implementation (iOS: Screen Time API / lock screen intercept, Android: accessibility service) — this is the *original vision* of the app, not just an app-open trigger
- Background notifications (expo-notifications is installed but not wired)
- Login prompt after first video saved (peak emotional investment moment)
- Cloud backup
- Android testing (developed primarily on iOS)

---

## Business Model

- **Free tier:** limited recordings, date/time trigger only, no repeat
- **Past.Self. Pro — €8.99 one-time:** unlimited videos, App Guard (when built), repeat scheduling
- No ads, ever — non-negotiable, ads destroy the emotional tone
- Login prompt after first video saved — not yet implemented

---

## Development Environment

**Primary machines:** Windows (PowerShell) + MacBook

**PowerShell note:** `&&` is not a valid statement separator in PowerShell. Run commands separately:
```powershell
git add .
git commit -m "your message"
git push
```

**Mac setup:**
```bash
git clone https://github.com/OmnifySolutions/Past.Self.App.git
cd Past.Self.App
npm install
npx expo start --clear
```

Phone must be on the same WiFi as the Mac. Scan QR code with camera (iOS) or Expo Go app (Android).

---

## Commands

```bash
npx expo start --clear      # Start dev server, clear cache
npx expo install [package]  # Install respecting SDK version
```

---

## How to Start a New Session

This CLAUDE.md is set as the Project Instructions — Claude reads it automatically at the start of every conversation in the Past.Self. project. No need to paste it manually.

If starting outside the project for any reason, paste the contents with:
> "This is the complete context for Past.Self., a React Native app I'm building. Please read it fully — especially the Core Instructions — before we continue."

GitHub: https://github.com/OmnifySolutions/Past.Self.App
