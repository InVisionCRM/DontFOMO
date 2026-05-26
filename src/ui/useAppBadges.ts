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
import {
  totalUnreadCount as totalUnreadTunnel,
  type TunnelChat,
} from '../engine/tunnel';
import {
  totalUnreadCount as totalUnreadMessages,
  type Conversation,
} from '../engine/messages';
import { findSensitive, type ClipboardEntry } from '../engine/clipboard';
import {
  CASH_SWIPE_DAILY_CAP,
  countBillsNeedingAttention,
  swipesRemaining,
} from '../engine/economy';
import type { AppId } from '../data/apps';

/**
 * Stable empty-array references for the stale-state fallback. Each
 * selector must return the SAME reference on every call when the
 * store value is missing, otherwise Zustand sees a fresh snapshot
 * each render and React loops on "Maximum update depth exceeded".
 */
const EMPTY_MAIL: readonly MailMessage[] = [];
const EMPTY_TUNNEL: readonly TunnelChat[] = [];
const EMPTY_MESSAGES: readonly Conversation[] = [];
const EMPTY_CLIPBOARD: readonly ClipboardEntry[] = [];

/**
 * Returns a map of app id → badge count. Apps without a badge are
 * omitted (the AppIcon ignores undefined badges).
 *
 * Clipboard surfaces a "1" badge whenever a sensitive entry is in
 * history — that's the visible nudge that teaches the player to
 * check the Clipboard, the defuse path for the Clipboard Scam
 * (Scam Library v1.1 Event #5).
 */
export function useAppBadges(): Partial<Record<AppId, number>> {
  // Read raw; the `?? ...` fallback is applied OUTSIDE the selector
  // so the selector's return stays a stable reference.
  const mail = useGameStore((s) => s.mail) ?? EMPTY_MAIL;
  const tunnel = useGameStore((s) => s.tunnel) ?? EMPTY_TUNNEL;
  const messages = useGameStore((s) => s.messages) ?? EMPTY_MESSAGES;
  const clipboard = useGameStore((s) => s.clipboard) ?? EMPTY_CLIPBOARD;
  const bank = useGameStore((s) => s.bank);
  const cashSwipe = useGameStore((s) => s.cashSwipe);
  const clockNow = useGameStore((s) => s.clock.now);

  const bankDue = countBillsNeedingAttention(bank?.bills ?? [], clockNow);
  const swipesLeft = swipesRemaining(cashSwipe, clockNow);

  const badges: Partial<Record<AppId, number>> = {
    mail: unreadCount(mail),
    tunnel: totalUnreadTunnel(tunnel),
    messages: totalUnreadMessages(messages),
    clipboard: findSensitive(clipboard) === null ? 0 : 1,
  };

  if (bankDue > 0) {
    badges.bank = bankDue;
  }

  // Full daily cap unused — a soft nudge to open CashSwipe once per day.
  if (swipesLeft === CASH_SWIPE_DAILY_CAP) {
    badges.cashswipe = 1;
  }

  return badges;
}
