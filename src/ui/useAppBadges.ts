/**
 * useAppBadges.ts — per-app "attention" counts for the home grid.
 * ------------------------------------------------------------------
 * Subscribes to the store and returns the unread / pending count for
 * each app that has one. Consumed by HomeScreen and Dock to feed
 * AppIcon's `badge` prop.
 *
 * Per Bible §5 — rewards stay quiet and pull-based; the badge is the
 * channel for "you have something to look at here."
 */
import { useGameStore } from '../state/store';
import { unreadCount, type MailMessage } from '../engine/mail';
import type { AppId } from '../data/apps';

/**
 * Stable empty-array reference for the stale-state fallback. The
 * selector must return the SAME reference on every call when the
 * store value is missing, otherwise Zustand sees a fresh snapshot
 * each render and React loops on "Maximum update depth exceeded".
 */
const EMPTY_MAIL: readonly MailMessage[] = [];

/**
 * Returns a map of app id → badge count. Apps without a badge are
 * omitted (the AppIcon ignores undefined badges).
 */
export function useAppBadges(): Partial<Record<AppId, number>> {
  // Read raw; the fallback is applied OUTSIDE the selector so the
  // selector's return is a stable reference. (See EMPTY_MAIL.)
  const mail = useGameStore((s) => s.mail) ?? EMPTY_MAIL;
  return {
    mail: unreadCount(mail),
  };
}
