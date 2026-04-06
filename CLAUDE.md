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
- **Never guess.** If information is needed to complete a task correctly — a file, a timing value, a behaviour, anything — ask for it. Guessing produces worse results than asking. Always.

**GitHub repo:** https://github.com/OmnifySolutions/Past.Self.App (public)

**Notion Project Hub:** https://www.notion.so/339658ccff7b81d6ae3af855e35da702
**Notion Design & Brand:** https://www.notion.so/339658ccff7b8115b77ae53ef7a2fd92

### GitHub access tip
Claude can fetch files directly when given a **raw** GitHub URL:
- ✅ `https://raw.githubusercontent.com/OmnifySolutions/Past.Self.App/main/App.tsx`
- ❌ `https://github.com/OmnifySolutions/Past.Self.App/blob/main/App.tsx` — blocked by robots.txt

To get a raw URL: open the file on GitHub → click "Raw" → copy that URL and paste it into chat.

---

## App Overview

**Name:** Past.Self. (with periods — always written exactly like this)
**Tagline:** Messages from your past to your future
**Secondary tagline (marketing):** Your future self is counting on you.
**Tagline decision pending:** Both taglines are in use across different surfaces. Primary tagline for App Store is not yet locked — defer this decision until pre-submission.

**Concept:** Users record short video messages to their future selves. Each video is triggered to play at a specific moment — either at a scheduled date/time (like an alarm) or when the user opens a specific app (e.g. Instagram). The purpose is motivation, accountability, habit-breaking, reminders, and self-persuasion.

**Why it works psychologically:** Hearing your own voice and seeing your own face creates a stronger emotional response than any external notification or quote. Your past self becomes your coach.

**Original vision / lock screen intent:** The founding idea was intercepting the user *before* they unlock their phone — your past self plays before you can get to Instagram or anything else. This is App Guard. App Guard is NOT just an app-open trigger — it intercepts at the OS level. A swipeable notification defeats the purpose entirely — the video must be forced on screen. Keep this intent in mind for all UX and feature decisions.

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
- expo-notifications — not yet wired up. Decision: simple push notifications rejected as primary trigger mechanism — a swipeable notification defeats the core product purpose. App Guard is the real solution.
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
- src/components/OnboardingIllustration.tsx — dead code, was for the cut OnboardingScreen. Do not recreate.

---

## Key Product Decisions (with reasoning)

### €8.99 one-time pricing — intentional
No subscription. One-time purchase signals trust. The target user is someone making a personal, emotional commitment — not someone who wants another monthly bill. Subscriptions also increase churn anxiety. Revisit only if monetisation data proves otherwise.

### No ads — permanent
Not a toggle. Not a "for now" decision. Ads would destroy the emotional tone of the app. Non-negotiable.

### Login prompt — timing is intentional
Login prompt appears on ConfirmationScreen ~800ms after the first video is saved — peak emotional investment. The user just recorded something meaningful; that's the exact moment the ask ("back this up") feels obvious, not intrusive. It fires only once ever (flagged in AsyncStorage via `pastself_login_prompted`). Both "Create free account" and "Maybe later" mark it as seen — we never nag. Copy is locked: title "Don't lose this." / body "This message took courage to record. A free account keeps it safe — forever."

### Filter/sort — deliberately cut
No filter or sort on the home screen. The list is short enough that it's not needed, and adding it would add UI complexity with no real payoff at this stage. Revisit only if user research proves otherwise.

### Notifications — deliberately not the trigger mechanism
Simple push notifications (expo-notifications) were evaluated and rejected as the primary trigger for App Guard. A notification the user can swipe away defeats the entire emotional core of the app. The real solution is App Guard (OS-level interception). Notifications may still be added as a supplementary reminder system later, but never as the primary trigger.

### App Guard — core feature, v1 target
App Guard is the founding vision of the app — forcing the video on screen before the user can open Instagram or any other app. It is NOT a nice-to-have. It is being built as part of v1.

**Platform strategy:**
- **Android first** — uses `AccessibilityService` to detect app launches and intercept. No special approval needed. No paid account needed to build and test. Being built now.
- **iOS** — requires Apple Developer account ($99/year, needed anyway for App Store) + `com.apple.developer.family-controls` entitlement (free but requires Apple approval — write explaining Past.Self. is a self-accountability/habit-breaking app). Apps like "One Sec" have this approved. iOS App Guard comes after Android is working and the developer account is sorted.

**Implementation path (Android):**
- Expo Development Build + custom Expo module in Java/Kotlin bridging Android's `AccessibilityService`
- No full ejection from Expo — custom native modules work alongside managed Expo workflow via development builds
- Testing: Expo Development Build on real Android device (not Expo Go — Expo Go can't run custom native modules)
- EAS account created at expo.dev — needed for development builds

**Do NOT implement notifications as a substitute for App Guard.** They are different things.

---

## Navigation Flow

```
App opens
  → SplashScreen (always shown)
      → First time: OnboardingCameraScreen → Record → Schedule → Confirmation → Home
      → Returning: short branded animation (~1.7s) → Home

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
- Phrase animation: slide in (320ms) → hold (1400ms) → fade out (280ms). Next phrase starts ONLY in the fade-out completion callback — not via setTimeout — to prevent flicker.
- Last phrase stays; "Try It Now!" button fades in with pulse + white glow
- **Returning users:** phraseIndex initialised to PHRASES.length - 1 in useState (NOT set via setState after mount — that caused a flash of phrase 0). Header fades in (500ms), last phrase shown immediately with no slide animation, 1200ms hold, then navigates to Home. Total ~1.7s.

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
- **Volume toggle:** Top-left corner, pill-shaped (matches skip button aesthetic). `player.muted` flips on tap. Icon: `volume-medium` / `volume-mute`. Session-only — does NOT persist between opens. Never saves mute state globally.
- No BrandAlert — was removed (dead code)

### HomeScreen
- useSafeAreaInsets() for paddingTop
- Three sections: Upcoming (hero card), Scheduled, App Triggers
- Empty state: fills full screen, How It Works visible without scrolling
- CRITICAL: All sub-components defined at module level outside HomeScreen — NEVER inline. Inline = remount every render = image flicker + animation resets.
- BrandAlert and useBrandAlert fully removed — were dead code (delete confirmation uses custom inline modal, not BrandAlert)

#### Header layout
- Left: app name (fonts.brittany, colors.text = #14273c deep navy) + tagline (colors.textLight)
- Right: gear icon (settings-outline, 18px, colors.textLight) + Record button (colors.danger), in a row with gap
- Note: colors.text (#14273c) reads as near-black on white — this is correct and intentional per brand spec. Do not "fix" it.

#### Settings modal (SettingsModal)
- Defined at module level — never inline
- Custom animated bottom sheet — does NOT use `animationType` on Modal (that's set to `"none"`). Sheet and backdrop animate independently via their own Animated.Values.
- Backdrop: `absoluteFillObject`, `colors.overlay`, animates opacity. Tapping backdrop closes the modal.
- Sheet: `position: absolute, bottom: 0`, slides via `translateY`. `rendered` state gates render so sheet unmounts after close animation completes — prevents ghost touches.
- paddingTop: spacing.lg (24px) — gives title breathing room under the rounded top edge
- No handle bar. No X button. Title is plain text. No divider lines between rows.
- Icon squares: `#9898d6` (periwinkle) background, `#fde5ea` (light pink) icon inside. Destructive row gets darker red bg (#c0392b).
- **Rate Past.Self.** row: opens App Store via `Linking.openURL('https://apps.apple.com/app/idYOUR_APP_ID')`. Swap `idYOUR_APP_ID` for real ID at submission.
- **Send feedback** row: opens `mailto:hello@omnifysolutions.com?subject=Past.Self.%20Feedback` via Linking.
- **Dev reset row:** Only rendered when `__DEV__ === true`. Calls `AsyncStorage.clear()` then `DevSettings.reload()`. Completely absent from production builds.
- Rows (in order): Account, Cloud backup, Notifications, App Guard, Rate Past.Self., Send feedback, About, [Reset app — dev only]

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
- useSafeAreaInsets() — NOT SafeAreaView
- Fade-in entrance animation
- Done: calls setOnboarded() then CommonActions.reset({ routes: [{ name: 'Home' }] })
- Tap thumbnail → Playback (isTriggered: false)
- Trigger card: icon + text centered with justifyContent: 'center'
- **Login prompt modal (LoginPromptModal):** Defined at module level. Shown 800ms after screen mounts (delay lets the confirmation fade-in settle first). Checks `hasSeenLoginPrompt()` from storage — if false, shows modal. Both CTA buttons call `setLoginPromptSeen()` so it never shows again. Sign-in handler has a `// TODO` for when auth is built. Copy locked — see Key Product Decisions above.

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

## Storage Keys

All AsyncStorage keys used in the app:

| Key | Purpose |
|---|---|
| `pastself_videos` | All ScheduledVideo objects (JSON array) |
| `pastself_onboarded` | Whether user has completed first recording flow |
| `pastself_login_prompted` | Whether login prompt has been shown (one-time ever) |

---

## Brand Identity

### App Icon
- **File:** App_Icon.png (in repo assets)
- **app.json:** `"icon": "./assets/App_Icon.png"` — points to App_Icon.png, NOT the default icon.png
- **Splash:** `splash.image` also set to `./assets/App_Icon.png` with backgroundColor `#fdf4f5`
- **Android:** `adaptiveIcon.foregroundImage` also set to `./assets/App_Icon.png`
- **Shape:** Rounded square (iOS standard)
- **Background:** Diagonal gradient — soft pink top-left (#fde5ea) → muted periwinkle bottom-right (#9898d6)
- **Logotype:** *P.S.* in Dancing Script, #14273c (Deep Navy), with subtle shadow for depth
- **Concept:** P.S. = postscript = a note added after. The double-period echoes the app name convention.
- ⚠️ **This is a temporary icon.** Final version needs designer polish before App Store submission.
- **Note on Expo Go:** The app icon does NOT appear in Expo Go — Expo Go always shows its own icon/placeholder during development. The icon only shows in standalone/production builds. This is expected behaviour, not a bug.

### Colors

```
Background:   #fdf4f5   (barely-there blush)
Card/White:   #ffffff
Accent:       #a194a8   (muted mauve)
AccentBlue:   #9898d6   (soft periwinkle — use sparingly)
Text Primary: #14273c   (deep navy — reads as near-black on white, intentional)
Text Light:   #a194a8
Danger/CTA:   #674454   (deep rose — primary action buttons)
Border:       rgba(20, 39, 60, 0.08)
Overlay:      rgba(20, 39, 60, 0.5)
Blush:        #fde5ea   (icon backgrounds in settings modal, gradient start)
```

### Five Canonical Brand Colors (from brand sheet)
| Name | Hex | Role |
|---|---|---|
| Deep Rose | #674454 | Primary CTA, buttons, active chips, record button, toggle-on |
| Soft Periwinkle | #9898d6 | Settings icon squares, sparingly elsewhere — see rule below |
| Muted Mauve | #a194a8 | Accent, text light, toggle-off, placeholders |
| Blush | #fde5ea | Background variant, gradient start, icon backgrounds in modals |
| Deep Navy | #14273c | Primary text, wordmark on light backgrounds |

### #9898d6 Usage Rule

Use sparingly: settings modal icon squares, progress bars, Upcoming badge dot, "Next:" date text, script prompt icons, "Paused" badge text, animated onboarding prompts. Never for primary actions or toggles.

### Fonts

```
App name:    Dancing Script Bold (fonts.brittany)
Headers:     Montserrat Bold 700 (fonts.montserratBold)
Subheaders:  Montserrat Medium 500 (fonts.montserratMedium)
Body/UI:     Inter Regular 400 (fonts.inter) / Inter Medium 500 (fonts.interMedium)
```

### Theme file (src/styles/theme.ts) — confirmed keys
```typescript
colors.background, colors.card, colors.accent, colors.accentPressed,
colors.text, colors.textLight, colors.danger, colors.border, colors.overlay

fonts.brittany, fonts.montserratBold, fonts.montserratMedium,
fonts.inter, fonts.interMedium

spacing.xs(4), spacing.sm(8), spacing.md(16), spacing.lg(24),
spacing.xl(32), spacing.xxl(48)

radius.sm(6), radius.md(10), radius.lg(12), radius.xl(16), radius.full(999)
```

### Brand Voice
- **Direct:** No hedging. "Record this now." Not "You might want to consider..."
- **Personal:** Second person always. "Your future self." Never "the user."
- **Warm but firm:** Like a friend who tells you the truth. Not a life coach. Not a chatbot.
- **No filler:** Every word earns its place.

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

### Splash Phrase Flicker Fix (CRITICAL)

Two fixes applied — do not revert:

1. **phraseIndex init:** `useState(isFirstTime ? 0 : PHRASES.length - 1)` — returning users get the correct phrase from frame one. Never `useState(0)` unconditionally.

2. **Next phrase sequencing:** The next phrase is called ONLY inside the fade-out `.start()` completion callback, after explicitly resetting `phraseOpacity.setValue(0)` and `phraseX.setValue(width * 0.45)`. Never via `setTimeout(..., 0)` while the fade is still running — that caused mid-fade opacity bleed-through.

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

### Login Prompt Logic

- `hasSeenLoginPrompt()` — reads `pastself_login_prompted` from AsyncStorage
- `setLoginPromptSeen()` — writes `'true'` to that key
- Called in ConfirmationScreen on mount (with 800ms delay). Fires on first save only.
- Both "Create free account" and "Maybe later" call setLoginPromptSeen() — one shot, never repeats.

### RepeatOption

Always type repeat fields as RepeatOption, never string. Defined in src/types/video.ts. All repeatUtils.ts functions accept RepeatOption.

### Monthly Repeat

Clamps to last day of month: detects overflow via next.getDate() !== originalDay, rolls back with setDate(0). Safety counter: 60 iterations.

---

## app.json — current state

```json
{
  "expo": {
    "name": "Past Self",
    "slug": "past-self",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/App_Icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/App_Icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#fdf4f5"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.pastself.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Past Self needs camera access to record your video messages.",
        "NSMicrophoneUsageDescription": "Past Self needs microphone access to record audio in your video messages.",
        "NSPhotoLibraryUsageDescription": "Past Self needs photo library access to save your video messages."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/App_Icon.png",
        "backgroundColor": "#fde5ea"
      },
      "package": "com.pastself.app",
      "permissions": ["CAMERA", "RECORD_AUDIO", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "RECEIVE_BOOT_COMPLETED", "VIBRATE"]
    },
    "plugins": ["expo-camera", "expo-video"]
  }
}
```

---

## Testing

### Expo Go (current)
- Run: `npx expo start --clear` on Mac, scan QR with phone
- Use **"Reset app (dev)"** in Settings modal to test as new user
- Expo Go CANNOT run custom native modules — needed for App Guard

### Expo Development Build (next, for App Guard)
- Required once native Android AccessibilityService module is added
- Build via EAS: `eas build --profile development --platform android`
- Install the .apk on Android device, then scan QR as normal
- EAS account: created at expo.dev

### Dev reset
The **"Reset app (dev)"** row in Settings modal (`__DEV__ === true` only):
1. `AsyncStorage.clear()` — wipes all data
2. `DevSettings.reload()` — hard-restarts JS bundle
Do NOT add any other reset mechanisms.

---

## Current Development State

### Working
- Full recording flow
- Permanent video + thumbnail storage (randomUUID IDs)
- expo-video playback (two-component pattern, correct event API)
- Done / Skip button logic
- Volume toggle on PlaybackScreen (session-only mute, top-left pill)
- Date/time trigger + RepeatOption typed repeat (monthly drift fixed)
- App trigger: simulated, "Coming Soon" banners on Schedule + Edit screens
- Edit + re-record (replace() cleans stack)
- Auto-trigger: HomeScreen focus + 30s + foreground (not during Splash)
- Onboarding: setOnboarded() called → no loop back
- CommonActions.reset() navigation clears full stack correctly
- How It Works: 88% width, centered, marginBottom, card shadow/border
- navigationRef fully typed
- RepeatOption union type everywhere
- useSafeAreaInsets on all screens
- Dead code fully cleaned: BrandModal, BrandAlert+useBrandAlert (HomeScreen), OnboardingScreen, OnboardingIllustration, expo-av, expo-image-picker, expo-media-library, @react-navigation/stack
- app.json: icon + splash + android adaptive icon all pointing to App_Icon.png
- Brand identity locked: colors, typography, icon concept, brand voice
- HomeScreen SwipeableCard: fully working swipe-to-delete
- HomeScreen DraggableList: six-dot handle drag-to-reorder
- HomeScreen card visual polish (shadows, borders, paused states)
- Thumbnail bug (PS-1): permanent URI via expo-video-thumbnails at save time — confirmed working
- Settings modal: animated bottom sheet, periwinkle (#9898d6) icon squares, pink icons, dev reset row, paddingTop spacing.lg
- Settings modal: Rate Past.Self. and Send feedback rows wired with Linking.openURL
- Login prompt: one-time modal on ConfirmationScreen, locked copy, both buttons mark as seen
- SplashScreen returning user path: ~1.7s, phraseIndex initialised correctly, no flicker, no wasted time

### Known Issues / Pending
- Multi-video trigger queue: if two or more videos are past-due simultaneously, only one triggers per check cycle. The second fires 30s later. Low severity.
- Settings modal rows (Account, Cloud backup, Notifications, App Guard, About) are stubs — close modal on tap. Wire up as features are built.
- Login prompt sign-in handler is a stub — needs real auth screen when backend exists.
- Rate Past.Self. URL: `idYOUR_APP_ID` placeholder — swap for real App Store ID at submission.

### TODO Before App Store
- **App Guard — Android** (next major feature): custom Expo module, Android AccessibilityService, Expo Development Build
- **App Guard — iOS**: requires Apple Developer account ($99/yr) + `com.apple.developer.family-controls` entitlement approval
- Auth / account creation screen
- Cloud backup
- Final app icon — App_Icon.png is temporary concept
- App Store screenshots
- Primary tagline decision — defer until pre-submission
- Apple Developer account — needed for iOS App Guard entitlement + App Store submission

---

## Business Model

- **Free tier:** limited recordings, date/time trigger only, no repeat
- **Past.Self. Pro — €8.99 one-time:** unlimited videos, App Guard (when built), repeat scheduling
- No ads, ever — non-negotiable
- Login prompt fires once after first video saved — implemented, auth backend not yet built

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
npx expo start --clear                                    # Start dev server, clear cache
npx expo install [package]                                # Install respecting SDK version
eas build --profile development --platform android        # Build Android dev client (for App Guard)
eas build --profile development --platform ios            # Build iOS dev client
```

---

## How to Start a New Session

This CLAUDE.md is set as the Project Instructions — Claude reads it automatically at the start of every conversation in the Past.Self. project. No need to paste it manually.

If starting outside the project for any reason, paste the contents with:
> "This is the complete context for Past.Self., a React Native app I'm building. Please read it fully — especially the Core Instructions — before we continue."

GitHub: https://github.com/OmnifySolutions/Past.Self.App
Notion: https://www.notion.so/339658ccff7b81d6ae3af855e35da702
