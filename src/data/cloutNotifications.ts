/**
 * cloutNotifications.ts — seed feed for the Clout Notifications tab.
 * ------------------------------------------------------------------
 * v1 is a read-only static list. Mirrors the five entries shown in
 * `DontFOMO_X_App_Mockup.html` (lines 433–446) — follow, like,
 * repost, mention, streak — so the bell tab feels like a real
 * notifications panel without yet wiring engine events into it.
 *
 * Pure data per CLAUDE.md §5. A later milestone will replace this
 * with live notifications driven off the engine (clout streak,
 * scam-director arms, friend chatter, etc.).
 */

/**
 * Icon kind for the leading glyph. `mention` renders an `@` badge in
 * the brand blue; the others render a stroked SVG glyph in the
 * type's signature colour.
 */
export type CloutNotifKind = 'follow' | 'like' | 'repost' | 'mention' | 'streak';

/**
 * Three-segment notification body. The middle segment renders bold;
 * the trailing segment renders muted (used for the quoted post or
 * mention preview). Either side may be empty.
 */
export interface CloutNotification {
  id: string;
  kind: CloutNotifKind;
  /** Hex colour for the icon glyph. */
  iconColor: string;
  /** Leading regular-weight text (may be empty). */
  before: string;
  /** Bold-weight middle segment. */
  bold: string;
  /** Trailing regular-weight text (may be empty). */
  after: string;
  /** Optional muted suffix — a quoted post or mention preview. */
  muted?: string;
}

const FOLLOW_BLUE = '#1D9BF0';
const LIKE_PINK = '#F91880';
const REPOST_GREEN = '#00BA7C';
const MENTION_BLUE = '#1D9BF0';
const STREAK_ORANGE = '#FB923C';

/** v1 read-only seed — ordered newest first. */
export const CLOUT_NOTIFICATIONS_SEED: readonly CloutNotification[] = [
  {
    id: 'notif-follow-001',
    kind: 'follow',
    iconColor: FOLLOW_BLUE,
    before: '',
    bold: 'chart fairy',
    after: ' and 3 others followed you',
  },
  {
    id: 'notif-like-002',
    kind: 'like',
    iconColor: LIKE_PINK,
    before: '',
    bold: 'sarah',
    after: ' and 88 others liked your post:',
    muted: '“bought the top again…”',
  },
  {
    id: 'notif-repost-003',
    kind: 'repost',
    iconColor: REPOST_GREEN,
    before: '',
    bold: 'Ape House',
    after: ' reposted your post',
  },
  {
    id: 'notif-mention-004',
    kind: 'mention',
    iconColor: MENTION_BLUE,
    before: '',
    bold: '@DAVE_protoco1',
    after: ' mentioned you:',
    muted: '“Congratulations — your wallet was selected to receive…”',
  },
  {
    id: 'notif-streak-005',
    kind: 'streak',
    iconColor: STREAK_ORANGE,
    before: 'You’re on a ',
    bold: '12-day streak.',
    after: ' Post today to keep it alive and earn +7 followers.',
  },
];
