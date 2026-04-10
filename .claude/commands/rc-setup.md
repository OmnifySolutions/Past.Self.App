Walk through the RevenueCat activation checklist for Past.Self. This should only be run when you have a RevenueCat account set up, API keys ready, and the entitlement configured in the RC dashboard.

Before starting, confirm: "Do you have your RevenueCat API keys and have you set up the 'pro' entitlement in the RC dashboard?" If not, stop and explain what needs to be done on the RevenueCat side first.

## Checklist

Work through each step in order. Show progress as you go.

### Step 1 — Read current state
Read `src/utils/subscription.ts` in full. Confirm:
- `SUBSCRIPTION_ENABLED = false` (about to flip it)
- The RC entitlement name is `"pro"` — if it's different, flag it now before anything changes
- `FREE_VIDEO_LIMIT` is set (default 5) — confirm with Dary if this is still the right limit

### Step 2 — Flip the flag + add API keys
In `src/utils/subscription.ts`:
1. Set `SUBSCRIPTION_ENABLED = true`
2. Add the RevenueCat API keys. Ask Dary to provide:
   - Android public SDK key (from RC dashboard → API Keys)
   - iOS public SDK key (from RC dashboard → API Keys)
   
   Add them as constants at the top of the file:
   ```typescript
   const RC_ANDROID_KEY = 'goog_xxxx';
   const RC_IOS_KEY = 'appl_xxxx';
   ```
   Then pass the correct key to `Purchases.configure()` based on platform.

### Step 3 — Verify initSubscription call in App.tsx
Read `App.tsx` and confirm `initSubscription()` is called on app launch (in the font/setup effect). If it's missing, add it.

### Step 4 — Verify PaywallModal wiring
Read `src/components/PaywallModal.tsx`. Confirm:
- It calls `purchaseMonthly()` and `purchaseLifetime()` from subscription.ts
- It calls `restorePurchases()` for the restore button
- Error states are handled (failed purchase doesn't crash)

### Step 5 — Verify feature gates
Check these files for `isPro` / `getIsPro()` gating:
- `src/screens/ScheduleScreen.tsx` — playOnce toggle gate
- `src/screens/EditScreen.tsx` — playOnce toggle gate
- Any repeat scheduling gates

Confirm gates trigger `PaywallModal` (not a silent no-op or a crash).

### Step 6 — Check FREE_VIDEO_LIMIT enforcement
Confirm that `HomeScreen.tsx` or the relevant save flow checks against `FREE_VIDEO_LIMIT` for free users before allowing a new recording to be saved.

### Step 7 — Verify entitlement name
In `src/utils/subscription.ts`, confirm the entitlement identifier passed to RC matches exactly what's in the RC dashboard. It must be `"pro"` (lowercase, no spaces). If the dashboard uses a different name, flag it — the names must match exactly or purchases will not unlock features.

### Step 8 — Pricing check
Confirm in the RC dashboard:
- Monthly product: ~€2.99/month (or local equivalent set in RC)
- Lifetime product: ~€8.99 one-time

These can only be set in the RC/App Store/Play Store dashboards — not in code. Just remind Dary to verify they match the intended pricing.

### Step 9 — Build requirement
RevenueCat requires a real device with a new development build to test (not Expo Go). Remind Dary:
```
RevenueCat cannot be tested in Expo Go.
Run: eas build --profile development --platform android
Then test on real device with a sandbox account.
```

## Output format
```
[ REVENUECAT SETUP CHECKLIST ]
✅ SUBSCRIPTION_ENABLED = true
✅ API keys added (Android + iOS)
✅ initSubscription() called in App.tsx
✅ PaywallModal purchase/restore handlers wired
✅ Feature gates verified — ScheduleScreen, EditScreen
⚠️  FREE_VIDEO_LIMIT — currently 5, confirm this is correct
✅ Entitlement name — "pro" matches dashboard
⚠️  Pricing — verify in RC dashboard / App Store Connect / Play Console

ACTION REQUIRED: New EAS development build needed before testing purchases.
```
