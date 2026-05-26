/**
 * authorityNotice.ts — content data for the Authority Notice scam.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). The mockup at
 * `DontFOMO_ScamEvent_AuthorityNotice_Mockup.html` is the spec.
 *
 * Three exported pieces:
 *
 *   - `BANK_OFFICIAL_ADDRESS` — the email address the Bank lock
 *     screen prints; the player matches incoming emails against it
 *     exactly. Also the `fromAddress` of the genuine email.
 *
 *   - `buildAuthorityNoticePair(...)` — given an instance id and a
 *     timestamp, returns the two paired `MailMessage`s the Director
 *     plants on deployment. Each carries a `scamResolution` action
 *     so a tap routes to the generic `resolveScamInstance` store
 *     action (Mail UI stays scam-agnostic).
 *
 *   - `buildRegulatoryHoldNotice(...)` — the lock-screen copy the
 *     Bank app shows while `bank.regulatoryHold` is non-null. Pure
 *     data: case ref, agency name, expiry, support line.
 *
 * The two emails are intentionally NOT flagged `isSuspicious`. The
 * whole point of the Lockout archetype is that the player has to
 * spot the fake themselves by reading the sender against the lock
 * screen's printed address. Auto-flagging would kill the lesson.
 */

import { AUTHORITY_NOTICE_ID } from '../engine/scam-director';
import type { MailMessage } from '../engine/mail';

/**
 * The address the Bank publishes on its lock screen and signs its
 * own emails with. The genuine email matches this exactly; the fake
 * uses a believable lookalike. Single source of truth — change here
 * and both the lock screen and the genuine email update together.
 */
export const BANK_OFFICIAL_ADDRESS = 'notices@bank.com';

/** Typosquat on the official address — the second paired email. */
export const BANK_TYPOSQUAT_ADDRESS = 'notices@bannk.com';

/**
 * Lock-screen copy the Bank shows while a regulatory hold is active.
 * Pure data — the UI renders it.
 */
export interface RegulatoryHoldNotice {
  /** Agency name displayed on the seal. Fictional — not a real body. */
  agency: string;
  /** Display case reference. Cosmetic; not used by the engine. */
  caseRef: string;
  /** Epoch ms after which the hold auto-resolves as fell-for. */
  expiresAt: number;
  /** Genuine bank address the player should match against. */
  bankAddress: string;
}

/**
 * Build the lock-screen notice. `instanceId` seeds the case ref so
 * each deployment has its own (player-irrelevant) reference number.
 */
export function buildRegulatoryHoldNotice(
  instanceId: string,
  expiresAt: number,
): RegulatoryHoldNotice {
  // FCCB = Federal Crypto Compliance Bureau — deliberately fictional.
  // Avoids impersonating any real US agency in a shipped game.
  const seed = instanceId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return {
    agency: 'Federal Crypto Compliance Bureau',
    caseRef: `FCCB-2026-0517-A${seed}`,
    expiresAt,
    bankAddress: BANK_OFFICIAL_ADDRESS,
  };
}

/**
 * The two paired emails. The store inserts `fake` then `real` into the
 * inbox (newest-first), so `real` is the second message in the pair.
 *
 *   - `fake` — genuine Bank (`notices@bank.com`), safe path.
 *   - `real` — typosquat (`notices@bannk.com`), trap path.
 *
 * Each carries a `scamResolution` action so the Mail screen can
 * dispatch a generic `resolveScamInstance(instanceId, caught)` on
 * tap — no Authority-Notice-specific code in the UI layer.
 */
export interface AuthorityNoticePair {
  fake: MailMessage;
  real: MailMessage;
}

export function buildAuthorityNoticePair(
  instanceId: string,
  caseRef: string,
  arrivedAt: number,
): AuthorityNoticePair {
  const fake: MailMessage = {
    id: `${instanceId}-fake`,
    from: 'Bank',
    fromAddress: BANK_OFFICIAL_ADDRESS,
    subject: 'Routine hold — confirm a recent transaction',
    preview:
      'We placed a small hold while we confirm a recent charge. One tap clears it.',
    body:
      'Hi — we placed a routine hold on your account while we confirm a recent transaction. This is a standard fraud-screening step; nothing has been charged or removed.\n\n' +
      'Please confirm or reject the charge below. Once confirmed, the hold clears automatically and your account is back to normal — usually within a minute.\n\n' +
      'Charge being reviewed: $42.00 · Corner Café · today, 10:14 AM\n\n' +
      "If you didn't make this charge, tap the button and choose Reject on the next screen and we'll roll it back.",
    arrivedAt,
    unread: true,
    action: {
      label: 'Confirm this transaction',
      kind: 'safe',
      scamResolution: {
        scamId: AUTHORITY_NOTICE_ID,
        instanceId,
        caught: true,
      },
    },
  };

  const real: MailMessage = {
    id: `${instanceId}-real`,
    from: 'Bank',
    fromAddress: BANK_TYPOSQUAT_ADDRESS,
    subject: 'FINAL NOTICE — Settlement required to release hold',
    preview:
      'Outstanding tax liability of $4,200. Settle in crypto within 24h.',
    body:
      'NOTICE OF OUTSTANDING LIABILITY. Our records indicate that capital gains from your recent crypto activity have not been declared. Under Section 5b of the Digital Asset Compliance Act, an immediate settlement is required to release the hold on your bank account.\n\n' +
      `Amount due: $4,200.00. Payment must be made IN CRYPTO (BTC, ETH, or USDX) to the wallet provided after you tap the button below. Settlement within 24 hours releases the hold automatically. Case ref: ${caseRef}.\n\n` +
      'Failure to settle within the deadline will result in permanent account seizure, asset forfeiture, and referral for civil and criminal prosecution.',
    arrivedAt,
    unread: true,
    action: {
      label: 'Pay $4,200 in crypto to clear',
      kind: 'phish',
      scamResolution: {
        scamId: AUTHORITY_NOTICE_ID,
        instanceId,
        caught: false,
      },
    },
  };

  return { fake, real };
}
