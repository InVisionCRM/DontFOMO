/**
 * haptics.ts — banner-haptic wiring for `expo-haptics`.
 * ------------------------------------------------------------------
 * Bible §5: meaningful banners are paired with a "buzz" — a true
 * vibration on a real device. Expo Go ships `expo-haptics` so this
 * works without a custom dev build.
 *
 * The wrapper is a UI-layer concern by design: the store stamps a
 * `haptic` level on `BannerMessage` and `<Banner />` calls in here.
 * Engine and store stay free of any native imports (CLAUDE.md §5).
 *
 * Defensive: `notificationAsync` rejects on simulators and platforms
 * without a Taptic Engine. We swallow the rejection — a missing buzz
 * must never break the banner animation.
 */
import * as Haptics from 'expo-haptics';
import type { BannerHaptic } from '../../state/store';

const LEVEL_TO_FEEDBACK: Record<
  BannerHaptic,
  Haptics.NotificationFeedbackType
> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export function fireBannerHaptic(level: BannerHaptic): void {
  const feedback = LEVEL_TO_FEEDBACK[level];
  // `notificationAsync` returns a Promise; deliberately fire-and-forget
  // so the banner render stays synchronous. Swallow any rejection.
  void Haptics.notificationAsync(feedback).catch(() => undefined);
}
