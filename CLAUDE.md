# Past.Self. — Complete Project Context

> This file is the single source of truth for the Past.Self. app. Read this before making any changes. Update this file whenever significant features, design decisions, or architecture changes are made.

---

## Core Instructions for Claude

**Read this every session before doing anything else.**

I need you to be my business partner. Think critically. Give me criticism if something doesn't work. Tell me when something does work. Spar with me, discuss, question — do everything a business partner would do. Keep each other accountable and sharp. Don't just do everything I tell you — think together with me to build the best possible app.

This means:
- If I ask for something that will hurt UX, say so before implementing it
- If a feature idea is weak, push back and suggest a better one
- If something looks good, say so specifically and explain why
- Flag technical debt, inconsistencies, and risks proactively
- Never just agree to be agreeable

**GitHub repo:** https://github.com/OmnifySolutions/Past.Self.App (public)
Claude can fetch files directly when the user pastes a raw GitHub URL.

---

## App Overview

**Name:** Past.Self. (with periods — always written exactly like this)
**Tagline:** Messages from your past to your future
**Concept:** Users record short video messages to their future selves. Each video is triggered to play at a specific moment — either at a scheduled date/time (like an alarm) or when the user opens a specific app (e.g. Instagram). The purpose is motivation, accountability, habit-breaking, reminders, and self-persuasion.

**Why it works psychologically:** Hearing your own voice and seeing your own face creates a stronger emotional response than any external notification or quote. Your past self becomes your coach.

---

## Tech Stack

- **Framework:** React Native with Expo (SDK 54)
- **Language:** TypeScript
- **Navigation:** `@react-navigation/native` + `@react-navigation/native-stack`
- **Storage:** `@react-native-async-storage/async-storage`
- **Camera/Video recording:** `expo-camera`
- **Video playback:** `expo-video` (migrated from expo-av)
  - `useVideoPlayer` hook — must be called at TOP LEVEL only, never inside useEffect
  - Events use `useEventListener` imported from `'expo'` (NOT from `'expo-video'`)
  - `useEventListener(player, 'timeUpdate', callback)` for progress tracking
  - `useEventListener(player, 'playToEnd', callback)` for end detection
  - Set `player.timeUpdateEventInterval = 0.5` in the player init callback
- **File system:** `expo-file-system/legacy` (use `/legacy` import — base API is deprecated)
- **Thumbnails:** `expo-video-thumbnails` — generates real frames from permanent video file at save time
- **Gradient:** `expo-linear-gradient`
- **Safe Area:** `react-native-safe-area-context` — use `useSafeAreaInsets()` hook only, NEVER React Native's SafeAreaView
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
├── app.json                         # Expo config
├── CLAUDE.md                        # This file
└── src/
    ├── screens/
    │   ├── SplashScreen.tsx
    │   ├── OnboardingCameraScreen.tsx
    │   ├── OnboardingScreen.tsx     # Exists but currently unused/skipped
    │   ├── HomeScreen.tsx
    │   ├── RecordScreen.tsx
    │   ├── ScheduleScreen.tsx
    │   ├── EditScreen.tsx
    │   ├── PlaybackScreen.tsx
    │   └── ConfirmationScreen.tsx
    ├── components/
    │   └── BrandAlert.tsx
    ├── utils/
    │   ├── storage.ts
    │   └── repeatUtils.ts
    ├── types/
    │   └── video.ts
    └── styles/
        └── theme.ts
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
  → Tap thumbnail → Playback (isTriggered: false) → back to Home
  → Auto-trigger → Playback (isTriggered: true) → Home
```

---

## Screen Descriptions

### SplashScreen

- **Background:** LinearGradient `#fdf4f5` → `#f8e8ed` → `#e8c0cd`
- **Sparkles:** 1000 animated white (`#ffffff`) dots, randomized delays (0–8000ms), random loop gaps (1000–5000ms) so they never sync up. Opacity 0.75 at peak.
- **Header text:** "What if your" / "Past.Self." (Dancing Script 56, `#674454`) / "could..."
- **Cycling phrases** in `#9898d6`:
  1. stop you from procrastinating.
  2. break your bad habits.
  3. remind you why you started.
  4. stop you from wasting time...
- **Phrase animation:** slide in from right (translateX, 320ms) then hold (1400ms) then fade out (280ms). Next phrase starts sliding in simultaneously as current fades — zero gap, no overlap of text. Each phrase uses identical timing constants.
- **Last phrase** stays visible; "Try It Now!" button fades in on top
- **"Try It Now!" button:**
  - Pulsates: scale 1 → 1.06 → 1 over 1.8s loop
  - White glow: two stacked shadow layers (glowOuter: shadowRadius 28, glowInner: shadowRadius 12), both white, opacity pulses 0.2 → 1 → 0.2
  - Button itself has white inner shadow
- Returning users: short animation then auto-navigates to Home

### OnboardingCameraScreen

- **Background:** LinearGradient `#6b3f52` → `#52303f` → `#35202c`
- **Sparkles:** 60 dots, `#e8c4cc` color, delays 0–6000ms, randomized loop gaps
- **Camera icon:** Large standalone SVG (96px), no circle wrapper, centered via flex `justifyContent: 'center'` + `alignItems: 'center'` on parent. viewBox adjusted so lens is centered.
- Animated prompts cycle in `#9898d6`
- "Be honest. Be direct. Your future self is listening." above record button
- No skip button — forces first recording

### RecordScreen

- Full-screen camera, front-facing by default
- **Thought bubble:** Simple frosted glass pill at top center
  - `position: 'absolute', top: 128, left: 70, right: 70`
  - `backgroundColor: 'rgba(255,255,255,0.15)'`, `borderRadius: 16`
  - `borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'`
  - Text: "What would you like your\nfuture self to know?"
  - Font: `fonts.inter` (normal weight, NOT bold), `fontSize: 14`, `color: 'rgba(255,255,255,0.92)'`
  - No tail/circle — just the pill shape
  - Pulsates: scale 1 → 1.09 → 1 over 1.7s loop
  - Hidden while recording
- 12 script prompts (spell-checked)
- `useFocusEffect` cleanup stops camera on navigate away
- `isMountedRef` guards all state updates

### ScheduleScreen

- **CRITICAL:** Saves video URI to permanent storage using `expo-file-system/legacy`
- Copies video from temp camera URI to `FileSystem.documentDirectory + 'videos/' + id + '.mp4'`
- **Thumbnail:** Generates a real frame using `expo-video-thumbnails` at 0.5s into the video, copies to `FileSystem.documentDirectory + 'thumbnails/' + id + '.jpg'`. Thumbnail generation is non-fatal — video still saves if it fails.
- Uses `useSafeAreaInsets()` — NOT React Native's SafeAreaView
- Back button uses `navigation.goBack()` — NOT `navigation.navigate('Home')`
- Shows "Saving..." on button while copying
- Same form as EditScreen: title, note, date/time or app trigger, repeat

### PlaybackScreen

- **Architecture:** Two-component pattern
  - `PlaybackScreen` (outer): loads video from storage, shows black screen while loading
  - `PlayerView` (inner): only mounts once video is loaded, so `useVideoPlayer` always gets a real URI
- `useVideoPlayer({ uri: video.videoUri }, p => { p.timeUpdateEventInterval = 0.5; p.play(); })`
- **Done button logic:**
  - `isTriggered: false` (manual review from HomeScreen): Done button ALWAYS visible from start
  - `isTriggered: true` (scheduled/app trigger): Done only appears after video finishes
- `isTriggered` defaults to `false` via `?? false` — never undefined in PlayerView
- Skip button: appears after 5s, only when `isTriggered: true`
- Progress bar in `#9898d6`, time stamps below
- `nativeControls={false}` on VideoView

### HomeScreen

- Uses `useSafeAreaInsets` (no pink status bar gap)
- Three sections: Upcoming (hero card), Scheduled (datetime), App Triggers
- **Empty state:** fills the full screen without scrolling — How It Works section visible without scroll
- **Card layout:** drag handle (ellipsis-vertical dots) | thumbnail | info | iOS alarm toggle
- **Drag-to-reorder:** `DraggableList` component using `PanResponder`. Only the drag handle captures the gesture. State is mutated only on release (not mid-drag) to prevent twitching. Works on both Scheduled and App Triggers sections.
- **Swipe-to-delete:** `SwipeableCard` wrapper. Swipe left to reveal red Delete zone (72px). Tap to confirm via modal, swipe right to dismiss.
- **iOS alarm toggle:** custom `AlarmToggle` component, spring-animated. Controls `isPaused`, NOT `isActive`. Right-side of card, vertically centred via `alignSelf: 'stretch'` + `justifyContent: 'center'`.
- **Pause label:** only shown on manually paused non-play-once cards
- **Played label:** only shown on play-once app trigger cards that have fired
- **CRITICAL — no inline component definitions:** `UpcomingCard`, `AlarmToggle`, `HowItWorks`, `SwipeableCard`, `DraggableList` are all defined at module level outside `HomeScreen`. Inline definitions cause React to remount on every render → image flicker, animation resets.
- Tap thumbnail → `navigation.navigate('Playback', { videoId, isTriggered: false })`

### ConfirmationScreen

- Plays video preview (uses thumbnail Image, not actual video player)
- Tap thumbnail → `navigation.navigate('Playback', { videoId, isTriggered: false })`
- Manual Done button only

---

## Data Model

```typescript
interface ScheduledVideo {
  id: string;                    // Date.now().toString()
  videoUri: string;              // Permanent local file URI (in documentDirectory/videos/)
  thumbnail?: string;            // Permanent local file URI (in documentDirectory/thumbnails/)
  title: string;
  message: string;
  createdAt: string;
  scheduledFor?: string;         // ISO string for datetime trigger
  repeat?: string;               // 'never'|'daily'|'weekdays'|'weekends'|'weekly'|'monthly'
  appTrigger?: {
    appName: string;
    playOnce: boolean;
    hasPlayed?: boolean;
  };
  duration: number;              // seconds
  isActive: boolean;             // owned by trigger system — marks video done/expired. NEVER used for user pause.
  isPaused?: boolean;            // owned by user toggle — paused videos skip all trigger checks
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

### Fonts

```
App name:     Dancing Script Bold (fonts.brittany)
Headers:      Montserrat Bold 700
Subheaders:   Montserrat Medium 500
Body/UI:      Inter Regular 400 / Inter Medium 500
```

### #9898d6 Usage Rule

Use VERY sparingly — only for: progress bars, Upcoming badge dot, "Next:" date text, script prompt icons, "Paused" badge text, animated onboarding prompts. Never for primary actions or toggles.

---

## Key Logic

### Video Storage (CRITICAL — permanent URI)

Camera gives a temporary URI that iOS deletes. On save in ScheduleScreen:
1. Create `FileSystem.documentDirectory + 'videos/'` directory
2. Copy temp URI to permanent path: `permanentDir + videoId + '.mp4'`
3. Generate thumbnail with `expo-video-thumbnails` from the permanent video URI (time: 500ms)
4. Copy thumbnail to `FileSystem.documentDirectory + 'thumbnails/' + videoId + '.jpg'`
5. Save both permanent URIs to AsyncStorage — never the temp camera URIs
6. Import FileSystem from `'expo-file-system/legacy'` not `'expo-file-system'`

### expo-video Rules

- `useVideoPlayer` must be at TOP LEVEL of component — never inside useEffect, never conditionally
- Use the two-component pattern in PlaybackScreen so the hook always gets a real URI
- Import `useEventListener` from `'expo'`, not `'expo-video'`
- `fullscreenOptions` prop instead of deprecated `allowsFullscreen`

### Auto-trigger

- `checkScheduledVideos` is imported at top level in App.tsx — not dynamically inside the interval
- Called immediately on mount (cold-start triggers fire instantly), then every 30s, and on every app foreground via `AppState`
- Navigation guard: `navigationRef.current?.isReady()` checked before calling `navigate` — prevents race condition on cold start
- One-shot datetime: marked `isActive: false` immediately when triggered
- Repeating datetime: `scheduledFor` advanced to next future occurrence via `getNextOccurrence()`
- App triggers: NOT processed by the datetime scheduler loop — handled only by App Guard (when built)
- Paused videos (`isPaused: true`) are skipped entirely by `checkScheduledVideos`

### Repeat Logic (repeatUtils.ts)

- Monthly repeat uses day-clamping to prevent drift: Jan 31 → Feb 28 (not Mar 3). Detects JS date overflow via `next.getDate() !== originalDay` and rolls back with `setDate(0)`.
- Safety counter is 60 iterations (covers 2 months of daily advancement) — not 400.
- `getNextOccurrence` returns `null` if no future date found within safety limit.

### isPaused vs isActive — CRITICAL DISTINCTION

These two fields are owned by different systems and must never be conflated:
- `isActive` — owned by the trigger system. Set to `false` when a one-shot video has played or expires. Never toggled by the user directly.
- `isPaused` — owned by the user via the HomeScreen toggle. When `true`, the video is skipped in all trigger checks. Does not affect `isActive`.

### HomeScreen Component Architecture — CRITICAL

All sub-components (`UpcomingCard`, `AlarmToggle`, `HowItWorks`, `SwipeableCard`, `DraggableList`) MUST be defined at module level, outside the `HomeScreen` function. Defining them inline causes React to treat them as new component types on every render → remounts → image flickers + animation resets.

### Drag-to-Reorder Pattern (DraggableList)

- `PanResponder` attached to the drag handle only (ellipsis-vertical icon) — not the whole card
- During drag: only `Animated.Value` (`dragY`) moves — no state mutations
- On release: calculate new index from `dy / CARD_HEIGHT`, commit to `orderedIds` state, call `onReorder`
- `LayoutAnimation` animates remaining cards into new positions on release
- Parent `ScrollView` scroll is disabled during drag via `onScrollEnable` prop

### Swipe-to-Delete Pattern (SwipeableCard)

- `PanResponder` only intercepts horizontal gestures (`dx > dy * 1.5`)
- Uses `setOffset` + `setValue` pattern for re-open support
- Snap threshold: 60px left or velocity < -0.6
- Delete zone (72px wide) sits at `position: absolute, right: 0` behind the card
- Tapping the zone closes the swipe and opens the confirmation modal

### Re-record Flow

EditScreen/ScheduleScreen → `buildPrefill()` → Record → Schedule (pre-filled) → saves with same `prefill.id` (upsert). Re-saving always overwrites thumbnail with freshly generated one.

### Storage Upsert Pattern

`saveVideo()` checks if ID exists before inserting. If yes, updates in place. Prevents duplicates.

### PlaybackScreen Done / Deactivation Logic

Uses `else if` to prevent double `updateVideo` calls:
- App trigger (playOnce, not yet played) → sets `hasPlayed: true` and `isActive: false`
- Datetime one-shot (no repeat) → sets `isActive: false`
- Repeat datetime triggers are already advanced in `checkScheduledVideos` before screen mounts — PlaybackScreen does not touch them

---

## Current Development State

### Working
- Full recording flow (camera → schedule → confirmation → home)
- Video permanently saved to `documentDirectory/videos/` — survives app restarts
- Thumbnails permanently saved to `documentDirectory/thumbnails/` — real video frames via `expo-video-thumbnails`
- Video playback with `expo-video` (two-component pattern)
- Done button: always visible for manual review, gated for triggered playback
- Skip button: appears after 5s on triggered playback only
- Date/time trigger with repeat options (monthly drift fixed)
- App trigger (simulated — App Guard not yet native)
- Edit existing videos with re-record flow
- Upcoming card section with correct repeat label
- Auto-trigger: fires on cold start + every 30s + on foreground. Race condition fixed.
- SplashScreen: 1000 white sparkles, phrase slide-in/fade-out, pulsating glow button
- OnboardingCameraScreen: 60 sparkles, large centered camera icon (no circle)
- RecordScreen: frosted glass thought bubble (normal font, pulsating)
- PlaybackScreen: correct expo-video API, smart Done/Skip logic
- BrandAlert replacing all system alerts
- Camera green light fix (CameraView unmounts on blur)
- useSafeAreaInsets everywhere (no pink status bar gap)
- ScheduleScreen back button uses goBack() — no stack accumulation
- iOS alarm-style toggle (AlarmToggle) on every card — spring animated, vertically centred, right-side
- isPaused / isActive correctly separated — paused videos skip trigger checks
- "Paused" label: manual-pause only, never on play-once app trigger cards
- "Played" label: play-once app trigger cards only, after firing
- Drag-to-reorder on both Scheduled and App Triggers — stable, no mid-drag twitching
- Swipe-to-delete on all cards — Gmail/iOS style, red zone, confirmation modal
- Ellipsis-vertical (three dots) drag handle
- Empty state fills screen without scroll — How It Works visible without scrolling
- No inline component definitions in HomeScreen — eliminates image flicker on state updates

### Known Remaining Issue
- **Multi-video trigger queue:** If two datetime videos are both past-due simultaneously (e.g. after long absence), only one triggers per check cycle. The second fires 30 seconds later. Low severity.

### Not Yet Working / TODO Before App Store
- App Guard is simulated only (needs native iOS/Android implementation)
- Background notifications not wired (`expo-notifications` is installed but unused)
- Login prompt after first video saved (peak emotional investment — not yet built)
- Cloud backup not implemented
- OnboardingScreen (3-slide walkthrough) exists but is skipped — **decision: cut it.** OnboardingCamera IS the onboarding; the 3-slide version adds unnecessary friction.
- Android testing (developed primarily on iOS)

---

## Business Model

- **Free tier:** limited recordings, date/time trigger only, no repeat
- **Past.Self. Pro — €8.99 one-time:** unlimited videos, App Guard (when built), repeat scheduling
- No ads, ever
- Login prompt after first video saved (peak emotional investment) — **not yet implemented**

---

## Commands

```bash
npx expo start --clear                  # Start dev server
npx expo install [package]              # Install package (respects SDK version)
npx expo install expo-video-thumbnails  # Required — install if not already in package.json
```

---

## How to Start a New Claude Session

1. Copy this file's contents
2. Start new conversation
3. Paste with: "This is the complete context for Past.Self., a React Native app I'm building. Please read it fully — especially the Core Instructions — before we continue."
4. GitHub repo is public: https://github.com/OmnifySolutions/Past.Self.App
