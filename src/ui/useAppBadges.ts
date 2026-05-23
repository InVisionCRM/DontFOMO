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
import { unreadCount } from '../engine/mail';
import type { AppId } from '../data/apps';

/**
 * Returns a map of app id → badge count. Apps without a badge are
 * omitted (the AppIcon ignores undefined badges).
 */
export function useAppBadges(): Partial<Record<AppId, number>> {
  // The `?? []` guards against a stale Zustand store mid-Fast-Refresh
  // where a schema bump has added a new field that the in-memory
  // state hasn't been re-seeded with yet.
  const mail = useGameStore((s) => s.mail ?? []);
  return {
    mail: unreadCount(mail),
  };
}
