/**
 * catalog.ts — the data-driven scam catalogue.
 * ------------------------------------------------------------------
 * Each entry is a `ScamEventDef` per Scam Library v1.1. Sub-checkpoint
 * cadence:
 *
 *   6.2 ✅ Clipboard Scam      (Slow Burn,      Wallet+Clipboard)
 *   6.4 ✅ Authority Notice    (Lockout,        Bank+Mail)
 *   6.5a ✅ Golden Giveaway    (Inbound Lure,   Clout)
 *   6.5b ✅ Frozen Withdrawal   (Decision Point, Bank+Mail)
 *
 * Pure data (CLAUDE.md §5). New scams should mean a new entry here,
 * not new engine logic.
 *
 * Each catalog entry also declares its `trigger` (reactive or
 * proactive) — the Director arms reactive scams from player actions
 * (e.g. the Clipboard Scam from a leaked seed phrase) and chooses
 * proactive scams itself, gated on the pacing layer.
 */

import type { ScamEventDef } from './types';

/** Catalog id for the Clipboard Scam (Scam Library v1.1 Event #5). */
export const CLIPBOARD_SCAM_ID = 'clipboard-scam';
/** Catalog id for the Authority Notice scam (Scam Library v1.1 Event #13). */
export const AUTHORITY_NOTICE_ID = 'authority-notice';
/** Catalog id for the Golden Giveaway scam (Scam Library v1.1 Event #10). */
export const GOLDEN_GIVEAWAY_ID = 'golden-giveaway';
/** Catalog id for the Frozen Withdrawal scam (Scam Library v1.2 Event 7). */
export const FROZEN_WITHDRAWAL_ID = 'frozen-withdrawal';

export const SCAM_CATALOG: readonly ScamEventDef[] = [
  {
    id: CLIPBOARD_SCAM_ID,
    name: 'Clipboard recovery-phrase compromise',
    archetype: 'slow-burn',
    channels: ['clipboard', 'wallet', 'messages'],
    // 2/5 once the player knows the trap exists; 5/5 the first time.
    difficulty: 2,
    maxSeverity: 'severe',
    trigger: 'reactive',
    teaches:
      'Never copy your seed phrase. Anything on a phone clipboard can be silently scraped by any other app. Wallets want you to type recovery phrases by hand.',
  },
  {
    id: AUTHORITY_NOTICE_ID,
    name: 'Fake regulator account-freeze notice',
    archetype: 'lockout',
    channels: ['bank', 'mail'],
    difficulty: 3,
    // Drains bank cash to zero — painful but recoverable via Cash Swipe /
    // Rug Radar / unemployment. Crypto and assets are untouched.
    maxSeverity: 'major',
    trigger: 'proactive',
    teaches:
      'When your bank is on hold, match the sender address character-for-character to what the lock screen prints. Scammers use lookalike domains (e.g. bannk vs bank) and the same display name. Your bank never asks you to pay in crypto to release a hold.',
  },
  {
    id: GOLDEN_GIVEAWAY_ID,
    name: 'Fake-founder doubler giveaway takeover',
    archetype: 'inbound-lure',
    channels: ['clout'],
    // 1/5 — Scam Library v1.1: "great first-ever teaching event with
    // loud tells." The difficulty band overlap (1..3 / 2..4 / 3..5)
    // means newbie and middle bands can both surface this one; sharp
    // players see it only when the other two are in cooldown.
    difficulty: 1,
    // Realised severity caps at `minor` — the drain is 30% cash + 30%
    // crypto (Library Event 10), painful but recoverable in a session.
    // `minor` keeps the cooldown short and the vigilance reward small,
    // appropriate for the catalogue's loudest, earliest scam.
    maxSeverity: 'minor',
    trigger: 'proactive',
    teaches:
      'Celebrity giveaways are a scam. No real founder ever asks you to send crypto first to get more back. Verified checkmarks can be bought or faked — verify by navigating to the real account directly, never by tapping the link in the giveaway.',
  },
  {
    id: FROZEN_WITHDRAWAL_ID,
    name: 'Frozen withdrawal release-fee trap',
    archetype: 'decision-point',
    channels: ['bank', 'mail'],
    difficulty: 3,
    maxSeverity: 'major',
    trigger: 'reactive',
    teaches:
      'Legit platforms never ask you to pay a separate fee in crypto to release your own withdrawal. Match the sender to the address your bank prints on the hold screen — typosquats like bannk.com are a classic tell. When in doubt, wait or cancel the withdrawal.',
  },
];

/** Look up a catalog entry by id. Undefined if unknown. */
export function findScamDef(
  id: string,
  catalog: readonly ScamEventDef[] = SCAM_CATALOG,
): ScamEventDef | undefined {
  return catalog.find((d) => d.id === id);
}
