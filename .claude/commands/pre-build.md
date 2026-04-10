Run a full EAS build readiness check for Past.Self. before any `eas build` command. Do not start until all checks are complete. Work through each item in order and report pass/fail for each.

## Checks to perform

### 1. Autolinking — App Guard module
Run:
```
npx expo-modules-autolinking generate-package-list --platform android --target ./test-output.json
```
Then check if `com.appguard.AppGuardModule` appears in `test-output.json`. Clean up `test-output.json` after checking.
- PASS: module appears
- FAIL: module missing — check `modules/app-guard/android/build.gradle` exists, `expo-module.config.json` has `name` field, `modules/app-guard/package.json` has `name` and `main` fields, and root `package.json` has `expo.autolinking.nativeModulesDir: "./modules"`

### 2. app.json plugins
Read `app.json` and confirm all four plugins are present:
- `expo-camera`
- `expo-video`
- `expo-notifications` (with icon, color, androidMode, androidCollapsedTitle)
- `./modules/app-guard`

### 3. Local font files
Check that all 5 files exist in `assets/fonts/`:
- `DancingScript-Bold.ttf`
- `Montserrat-Medium.ttf`
- `Montserrat-Bold.ttf`
- `Inter-Regular.ttf`
- `Inter-Medium.ttf`

### 4. Font loading in App.tsx
Read `App.tsx` and confirm fonts are loaded via `Font.loadAsync()` using `require('./assets/fonts/...')` — NOT from `@expo-google-fonts` packages at runtime.

### 5. SparklesBG asset
Confirm `assets/SparklesBG.mp4` exists.

### 6. App icon
Confirm `assets/App_Icon.png` exists and that `app.json` references it for `icon`, `splash.image`, and `android.adaptiveIcon.foregroundImage`.

### 7. package.json — removed packages
Read `package.json` and confirm these are NOT present: `expo-av`, `expo-image-picker`, `expo-media-library`, `@react-navigation/stack`.

### 8. Subscription flag
Read `src/utils/subscription.ts` and confirm `SUBSCRIPTION_ENABLED = false` (unless Dary has explicitly said RevenueCat is configured — if so, skip this check and note it).

### 9. CLAUDE.md currency
Check that the "Working" section in `CLAUDE.md` roughly matches the current state — flag any obvious gaps (e.g. a feature that exists in code but isn't mentioned).

## Output format
Print a checklist:
```
[ PRE-BUILD CHECKLIST ]
✅ Autolinking — AppGuardModule found
✅ app.json plugins — all 4 present
✅ Font files — all 5 present
✅ Font loading — local require() in App.tsx
✅ SparklesBG.mp4 — present
✅ App icon — App_Icon.png wired correctly
✅ Removed packages — none found
✅ Subscription flag — SUBSCRIPTION_ENABLED = false
⚠️  CLAUDE.md — [specific gap if found]

RESULT: Ready to build / NOT ready (fix items above first)
```

If anything fails, explain exactly what to fix before building.
