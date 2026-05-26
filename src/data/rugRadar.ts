/**
 * rugRadar.ts — the Rug Radar card library.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). The cards the Rug Radar minigame deals
 * each day. v1 ships a single 10-card library taken from the
 * approved mockup (DontFOMO_RugRadar_App_Mockup.html); every entry
 * mirrors a real scam pattern from Scam Library v1.1 so grinding the
 * minigame literally rehearses the patterns the Scam Director throws
 * at the player live.
 *
 * Each card's `content` is a discriminated payload — the UI picks
 * the right renderer from the card's `type`. New card types are
 * added by extending the union, the data, and the renderer in
 * RugRadarCardView together.
 */
import type { RugRadarCard } from '../engine/rugRadar/rugRadar';

/** A stat row on a token card — label, value, optional semantic colour. */
export interface TokenStat {
  label: string;
  value: string;
  /** Tints the value text. Renderer maps these to theme colours. */
  tone?: 'green' | 'red' | 'amber';
}

/** Token launch card content. */
export interface TokenCardContent {
  kind: 'token';
  name: string;
  ticker: string;
  /** Two-stop gradient for the logo tile — [from, to]. */
  logoGradient: readonly [string, string];
  /** Single character / glyph to centre in the logo tile. */
  logoText: string;
  stats: readonly TokenStat[];
  audit: string;
}

/** Tweet / DM card content. */
export interface MessageCardContent {
  kind: 'message';
  /** Two-stop gradient for the avatar circle — [from, to]. */
  avatarGradient: readonly [string, string];
  /** 1-2 chars for the avatar. */
  avatarText: string;
  displayName: string;
  handle: string;
  /** Verification badge style. `null` for none. */
  verified: 'blue' | 'gold' | null;
  /** Rendered as plain text with basic markup — bold spans + a single link span. */
  body: string;
  /** Optional inline link the body refers to ("0xabcd…1234"). */
  link?: string;
  meta: string;
}

/** Email card content. */
export interface EmailCardContent {
  kind: 'email';
  sender: string;
  /** Sender email address — rendered in a monospace tint. */
  address: string;
  subject: string;
  body: string;
}

/** Wallet permission / signature request card content. */
export interface PermCardContent {
  kind: 'perm';
  action: string;
  rows: readonly { label: string; value: string; tone?: 'green' | 'red'; mono?: boolean }[];
}

/** Discriminated union — every card carries exactly one of these as `content`. */
export type RugRadarCardContent =
  | TokenCardContent
  | MessageCardContent
  | EmailCardContent
  | PermCardContent;

/**
 * The Rug Radar card library. v1 ships the 10 mockup cards in a
 * fixed order; future versions will expand the pool and seed-shuffle
 * a daily 10-card slice by dayKey so players see fresh decks.
 *
 * Order, content, payouts and difficulties were tuned in the
 * approved mockup. Pay attention to the mix: each of the four scam
 * archetypes (Lockout, Slow Burn, Inbound Lure, Decision Point)
 * and the four real-vs-fake counterparts are represented.
 */
export const RUG_RADAR_LIBRARY: readonly RugRadarCard[] = [
  {
    id: 'rr-tweet-cz-giveaway',
    type: 'tweet',
    tag: 'Clout post',
    isScam: true,
    pay: 45,
    difficulty: 2,
    shortLabel: 'CZ giveaway tweet',
    reason: 'Lookalike handle (extra letter), classic giveaway script',
    content: {
      kind: 'message',
      avatarGradient: ['#FBBF24', '#D97706'],
      avatarText: 'CZ',
      displayName: 'CZ Binance',
      handle: '@cz_binnance',
      verified: 'gold',
      body:
        'LIVE GIVEAWAY. To celebrate 200M users, sending 0.5–10 ETH ' +
        'to anyone who sends 0.1 ETH first to verify wallet:',
      link: '0x9f3b…E2c4',
      meta: 'Posted 4m ago · 312 retweets',
    } satisfies MessageCardContent,
  },
  {
    id: 'rr-token-nova',
    type: 'token',
    tag: 'New token launch',
    isScam: false,
    pay: 55,
    difficulty: 3,
    shortLabel: 'NOVA launch',
    reason: 'Liquidity locked 1yr, audit passed, balanced distribution',
    content: {
      kind: 'token',
      name: 'Nova Protocol',
      ticker: 'NOVA',
      logoGradient: ['#7C5CFF', '#3B82F6'],
      logoText: 'N',
      stats: [
        { label: 'Age', value: '3 days' },
        { label: 'Liquidity', value: 'Locked 12mo', tone: 'green' },
        { label: 'Top wallet', value: '4.1%', tone: 'green' },
        { label: 'Holders', value: '4,820' },
      ],
      audit: 'Audit: passed (CertiK) · contract verified · team doxxed',
    } satisfies TokenCardContent,
  },
  {
    id: 'rr-perm-bonus-claim',
    type: 'perm',
    tag: 'Wallet signature',
    isScam: true,
    pay: 65,
    difficulty: 4,
    shortLabel: 'Claim "bonus" approval',
    reason: 'UNLIMITED spend on a token you never bought + lookalike contract',
    content: {
      kind: 'perm',
      action: 'Approve token access',
      rows: [
        { label: 'Site', value: 'hot-launch-claim.app', mono: true },
        { label: 'Token', value: 'HOTT' },
        { label: 'Spend limit', value: 'UNLIMITED', tone: 'red' },
        {
          label: 'Contract',
          value: '0x8a4f…Bd91 (unverified)',
          tone: 'red',
          mono: true,
        },
      ],
    } satisfies PermCardContent,
  },
  {
    id: 'rr-email-withdrawal-ok',
    type: 'email',
    tag: 'Mail',
    isScam: false,
    pay: 35,
    difficulty: 2,
    shortLabel: 'Exchange withdrawal email',
    reason: 'Real sender domain, no payment ask, normal compliance language',
    content: {
      kind: 'email',
      sender: 'Exchange Compliance',
      address: 'noreply@exchange.com',
      subject: 'Your withdrawal is being processed',
      body:
        'Your withdrawal of $4,200 has cleared our routine compliance ' +
        'check. Funds should arrive in your bank account within 1 ' +
        'business day. No action is required from you.',
    } satisfies EmailCardContent,
  },
  {
    id: 'rr-dm-marcus-hijack',
    type: 'dm',
    tag: 'Messages',
    isScam: true,
    pay: 50,
    difficulty: 3,
    shortLabel: 'DM from "Marcus"',
    reason: '"Hijacked friend" — urgency + "pay you back double" + odd link',
    content: {
      kind: 'message',
      avatarGradient: ['#22C55E', '#15803D'],
      avatarText: 'M',
      displayName: 'Marcus',
      handle: 'via Messages',
      verified: null,
      body:
        'yo man emergency at the airport, can you front me $400 in USDX? ' +
        "send to this address — i'll pay you back DOUBLE tomorrow promise",
      link: '0x712a…9bF1',
      meta: 'Today 3:42 PM · unusual tone',
    } satisfies MessageCardContent,
  },
  {
    id: 'rr-token-pepemoon',
    type: 'token',
    tag: 'New token launch',
    isScam: true,
    pay: 25,
    difficulty: 1,
    shortLabel: 'PEPEMOON',
    reason: 'Liquidity unlocked, 1hr old, 78% in one wallet — obvious rug',
    content: {
      kind: 'token',
      name: 'PepeMoonInu',
      ticker: 'PEPEMOON',
      logoGradient: ['#22C55E', '#65A30D'],
      logoText: 'P',
      stats: [
        { label: 'Age', value: '1 hour', tone: 'red' },
        { label: 'Liquidity', value: 'UNLOCKED', tone: 'red' },
        { label: 'Top wallet', value: '78.2%', tone: 'red' },
        { label: 'Holders', value: '47', tone: 'red' },
      ],
      audit: 'Audit: none · team: anon · honeypot flags detected',
    } satisfies TokenCardContent,
  },
  {
    id: 'rr-tweet-vitalik-warning',
    type: 'tweet',
    tag: 'Clout post',
    isScam: false,
    pay: 50,
    difficulty: 3,
    shortLabel: 'Founder warning post',
    reason: 'Real verified founder warning *against* DMs — defensive post',
    content: {
      kind: 'message',
      avatarGradient: ['#7C5CFF', '#5B21B6'],
      avatarText: 'V',
      displayName: 'Vitalik B.',
      handle: '@VitalikButerin',
      verified: 'blue',
      body:
        'Reminder: I will never DM you, run a giveaway, or ask you to ' +
        'send ETH first. Anyone claiming to be me in your DMs is an ' +
        'impersonator. Report and block.',
      meta: 'Posted 1h ago · 18.4k retweets',
    } satisfies MessageCardContent,
  },
  {
    id: 'rr-email-release-fee',
    type: 'email',
    tag: 'Mail',
    isScam: true,
    pay: 65,
    difficulty: 4,
    shortLabel: 'Withdrawal "release fee"',
    reason: 'Advance-fee fraud + crypto release fee + countdown',
    content: {
      kind: 'email',
      sender: 'Exchange Security Desk',
      address: 'security@exchnage-support.co',
      subject: 'URGENT: Pay release fee within 24h or funds forfeit',
      body:
        'Your withdrawal of $12,000 is held pending a one-time anti-' +
        'money-laundering release fee of $480 in USDT. Send to wallet ' +
        '0xa1f2…77bD within 24 hours or funds will be permanently ' +
        'forfeited per Section 7 of our terms.',
    } satisfies EmailCardContent,
  },
  {
    id: 'rr-perm-nova-swap',
    type: 'perm',
    tag: 'Wallet signature',
    isScam: false,
    pay: 45,
    difficulty: 3,
    shortLabel: 'NOVA swap signature',
    reason: 'Capped spend matches purchase, named DEX, verified contract',
    content: {
      kind: 'perm',
      action: 'Approve swap on Uniswap',
      rows: [
        { label: 'Site', value: 'app.uniswap.org', mono: true },
        { label: 'Token', value: 'USDX' },
        { label: 'Spend limit', value: '200 USDX', tone: 'green' },
        {
          label: 'Contract',
          value: '0xC36…1f33 (verified)',
          tone: 'green',
          mono: true,
        },
      ],
    } satisfies PermCardContent,
  },
  {
    id: 'rr-dm-recovery-vulture',
    type: 'dm',
    tag: 'Tunnel DM',
    isScam: true,
    pay: 75,
    difficulty: 5,
    shortLabel: 'Crypto Recovery DM',
    reason: 'Recovery scam — no legit recovery service exists',
    content: {
      kind: 'message',
      avatarGradient: ['#3B82F6', '#1E40AF'],
      avatarText: 'CR',
      displayName: 'Crypto Recovery Unit',
      handle: '@official_recovery',
      verified: 'blue',
      body:
        'We noticed your wallet was drained 4 days ago. Our team has a ' +
        '92% success rate clawing back stolen funds. Small upfront ' +
        'retainer of $300 to open your case. Reply YES.',
      meta: 'Sent 12m ago · how did they know?',
    } satisfies MessageCardContent,
  },
];

/**
 * Return today's deck. v1 simply returns the fixed library — every
 * day, every player gets the same 10 cards. Once the library grows
 * past 10, this becomes a seed-shuffled slice; the signature is
 * already in place so callers do not have to change.
 */
export function dailyDeck(_dayKey: string): readonly RugRadarCard[] {
  return RUG_RADAR_LIBRARY;
}
