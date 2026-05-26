/**
 * haptics.ts — light tactile feedback for key game moments.
 * ------------------------------------------------------------------
 * Wraps `expo-haptics` so UI code never imports it directly. All
 * calls are fire-and-forget and no-op when the module is unavailable
 * (e.g. web or simulators without Taptic Engine).
 */
import * as Haptics from 'expo-haptics';

/** Soft tap — banners, successful taps, subtle confirmations. */
export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium tap — larger wins or warnings (reserved for later). */
export function hapticMedium(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
