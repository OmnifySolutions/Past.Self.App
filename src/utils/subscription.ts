import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ─── Configuration ────────────────────────────────────────────────────────────
//
// SUBSCRIPTION_ENABLED = false → all purchase calls are no-ops, every user is free.
// Flip this to true once RevenueCat account + products are configured.
//
// To activate:
// 1. Create a RevenueCat account at app.revenuecat.com
// 2. Add your app (iOS + Android)
// 3. Create an Entitlement named "pro" in RevenueCat dashboard
// 4. Create two Offerings: one with a monthly package + one lifetime package
// 5. Replace the placeholder keys below with your actual RC API keys
// 6. Set SUBSCRIPTION_ENABLED = true

const SUBSCRIPTION_ENABLED = false;
const RC_API_KEY_IOS     = 'appl_REPLACE_ME'; // from RevenueCat dashboard → API Keys
const RC_API_KEY_ANDROID = 'goog_REPLACE_ME';

// ─── Free tier limits ─────────────────────────────────────────────────────────
// Change FREE_VIDEO_LIMIT to adjust how many videos free users can create.
export const FREE_VIDEO_LIMIT = 5;

// ─── Init (call once in App.tsx) ──────────────────────────────────────────────
export function initSubscription(): void {
  if (!SUBSCRIPTION_ENABLED) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID,
  });
}

// ─── Status ───────────────────────────────────────────────────────────────────
export async function getIsPro(): Promise<boolean> {
  if (!SUBSCRIPTION_ENABLED) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active['pro'];
  } catch {
    return false;
  }
}

// ─── Purchase: Monthly subscription (7-day free trial) ───────────────────────
export async function purchaseMonthly(): Promise<{ success: boolean; error?: string }> {
  if (!SUBSCRIPTION_ENABLED) return { success: false };
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.monthly;
    if (!pkg) return { success: false, error: 'Monthly plan not found. Please try again later.' };
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false };
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ─── Purchase: Lifetime one-time ──────────────────────────────────────────────
export async function purchaseLifetime(): Promise<{ success: boolean; error?: string }> {
  if (!SUBSCRIPTION_ENABLED) return { success: false };
  try {
    const offerings = await Purchases.getOfferings();
    // RevenueCat: create a custom package with identifier "lifetime" in your Offering
    const pkg = offerings.current?.lifetime ?? offerings.current?.availablePackages.find(
      p => p.identifier === 'lifetime'
    );
    if (!pkg) return { success: false, error: 'Lifetime plan not found. Please try again later.' };
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false };
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  if (!SUBSCRIPTION_ENABLED) return false;
  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active['pro'];
  } catch {
    return false;
  }
}
