Scan the file(s) provided for Past.Self. brand and architecture violations. If no file is specified in the arguments, ask which file or screen to review before proceeding.

The argument will be a file path or screen name, e.g.: `/brand-review src/screens/HomeScreen.tsx`

## What to check

Read the target file fully, then check each rule below. Report every violation with the exact line number and what to fix.

### Architecture rules
1. **No inline sub-components** — sub-components must be defined at module level (outside the parent screen function). Flag any component function defined inside another component function.
2. **No `SafeAreaView`** — must use `useSafeAreaInsets()` hook instead. The RN `SafeAreaView` causes a pink status bar gap on iOS.
3. **No `useVideoPlayer` called conditionally or inside `useEffect`** — must be called at top level only.
4. **`useEventListener` must import from `'expo'`** — not from `'expo-video'`.
5. **`player.pause()` on unmount must be wrapped in try/catch** — may already be released on Android.
6. **No `Date.now()` for video IDs** — must use `Crypto.randomUUID()` from `expo-crypto`.
7. **No `mode="datetime"` on DateTimePicker** — must use two separate pickers: `mode="date"` then `mode="time"`. Combined mode causes black screen on Android.
8. **No `navigation.navigate('Home')` from ConfirmationScreen** — must use `CommonActions.reset({ routes: [{ name: 'Home' }] })`.
9. **expo-file-system must import from `expo-file-system/legacy`** — base import is deprecated.
10. **No temp camera URIs saved to AsyncStorage** — only permanent `documentDirectory/videos/{id}.mp4` paths.

### Brand / theme rules
11. **No hardcoded colors** — all colors must use `colors.*` from theme. Flag any hex strings or rgba() values that don't match a theme token. Exceptions: overlay/border values used directly in StyleSheet that match `colors.border` or `colors.overlay` exactly are fine.
12. **No hardcoded font names** — must use `fonts.*` from theme.
13. **No hardcoded spacing numbers** that duplicate theme values (e.g. `padding: 16` when `spacing.md` is 16) — flag these.
14. **`#9898d6` (AccentBlue) used for primary actions or toggles** — this color is for settings icons, badges, prompts only. Flag misuse.
15. **`colors.text` (#14273c) "fixed" to a lighter color** — this near-black on white is intentional per brand. Flag any change.

### Data model rules
16. **`repeat` typed as `string` instead of `RepeatOption`** — must use the union type from `src/types/video.ts`.
17. **`appTrigger` objects missing `packageName` field** — required for AppGuard matching.
18. **`appTrigger` objects missing `cooldownMinutes` field** — required, default 30.
19. **`isActive` set by user toggle code** — `isActive` is trigger-system only. User pause must use `isPaused`.

### PlaybackScreen-specific (if reviewing PlaybackScreen)
20. **`handleDone` writes `isActive: false` for datetime videos** — only write for `appTrigger.playOnce` case. Datetime one-shots are already marked by `checkScheduledVideos`.
21. **`navigation.goBack()` used when `isTriggered: true`** — triggered playback must use `CommonActions.reset` to avoid exiting the app when stack is empty.

## Output format
```
[ BRAND REVIEW — src/screens/ExampleScreen.tsx ]

VIOLATIONS:
❌ Line 47 — Inline sub-component `CardItem` defined inside `ExampleScreen`. Move to module level.
❌ Line 112 — Hardcoded color `#674454` — use `colors.danger`.
❌ Line 203 — `mode="datetime"` on DateTimePicker — split into two separate pickers.

CLEAN:
✅ Safe area — useSafeAreaInsets() used correctly
✅ No Date.now() IDs
✅ Font references use theme tokens

RESULT: 3 violations found. Fix before merging.
```

If the file is clean, say so clearly. Don't invent violations.
