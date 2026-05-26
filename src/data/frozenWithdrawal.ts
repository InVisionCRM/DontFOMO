/**
 * frozenWithdrawal.ts — content for the Frozen Withdrawal scam.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). Spec:
 * `DontFOMO_ScamEvent_FrozenWithdrawal_Mockup.html`.
 *
 * Decision Point archetype — the player triggered a large Bank
 * withdrawal; the trap rides on that real action. Canon:
 *   - Lock screen + genuine email → `BANK_OFFICIAL_ADDRESS`
 *   - Second paired email (typosquat trap) → `BANK_TYPOSQUAT_ADDRESS`
 */

import { FROZEN_WITHDRAWAL_ID } from '../engine/scam-director';
import type { MailMessage } from '../engine/mail';
import {
  BANK_OFFICIAL_ADDRESS,
  BANK_TYPOSQUAT_ADDRESS,
} from './authorityNotice';

/** Minimum USD withdrawal that can trigger this scam. */
export const FROZEN_WITHDRAWAL_MIN_USD = 10_000;

export interface FrozenWithdrawalPair {
  /** Genuine bank email (`notices@bank.com`) — safe / waited path. */
  genuine: MailMessage;
  /** Typosquat trap (`notices@bannk.com`) — fell-for path. */
  trap: MailMessage;
}

/** Build a display reference from the instance id. */
export function withdrawalReference(instanceId: string): string {
  const seed = instanceId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `WD-2026-0517-${seed}`;
}

/** Truncate a wallet address for display. */
export function truncateWallet(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

/**
 * Build the two paired emails. Store inserts `genuine` then `trap`
 * (newest-first inbox → trap appears above genuine).
 */
export function buildFrozenWithdrawalPair(
  instanceId: string,
  reference: string,
  amountUsd: number,
  destinationWallet: string,
  arrivedAt: number,
): FrozenWithdrawalPair {
  const amountLabel = amountUsd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const dest = truncateWallet(destinationWallet);

  const genuine: MailMessage = {
    id: `${instanceId}-genuine`,
    from: 'Bank',
    fromAddress: BANK_OFFICIAL_ADDRESS,
    subject: 'Withdrawal under review — no action needed',
    preview:
      `We placed a routine hold on your ${amountLabel} transfer. You don't need to do anything.`,
    body:
      `Hi — your withdrawal of ${amountLabel} to ${dest} is going through a routine compliance review. Transfers over $10,000 get this check automatically; no action is required on your part.\n\n` +
      'Your funds will arrive at the destination wallet within 1 business day. You will get a separate notice when the transfer completes.\n\n' +
      "If you didn't initiate this withdrawal, tap \"Cancel the withdrawal\" below and the funds will stay in your Bank account — no fees, no questions. Bank will never ask you to pay a fee to release your own money.",
    arrivedAt,
    unread: true,
    action: {
      label: "OK — I'll wait",
      kind: 'safe',
      scamResolution: {
        scamId: FROZEN_WITHDRAWAL_ID,
        instanceId,
        caught: true,
      },
    },
    secondaryAction: {
      label: 'Cancel the withdrawal instead',
      kind: 'info',
      scamResolution: {
        scamId: FROZEN_WITHDRAWAL_ID,
        instanceId,
        caught: false,
        decision: 'cancelled',
      },
    },
  };

  const trap: MailMessage = {
    id: `${instanceId}-trap`,
    from: 'Bank Withdrawal Clearance',
    fromAddress: BANK_TYPOSQUAT_ADDRESS,
    subject: `Withdrawal #${reference} — release fee required (24h)`,
    preview: 'Pay 0.018 BTC release fee to clear the hold. Failure = funds forfeit.',
    body:
      `Hello,\n\nYour withdrawal of ${amountLabel} to ${dest} has been flagged for additional clearance fees under our Large Transfer Compliance Programme.\n\n` +
      'To release the hold and complete the transfer, please pay the clearance fee below within 24 hours. Failure to remit results in the funds being frozen indefinitely.\n\n' +
      'Release fee: 0.018 BTC ($640)\nPay to: 0xRel…f29a\n' +
      `Reference: ${reference}\n\n` +
      'Once received the hold lifts automatically and your transfer arrives within minutes.',
    arrivedAt,
    unread: true,
    action: {
      label: 'Pay 0.018 BTC release fee',
      kind: 'phish',
      scamResolution: {
        scamId: FROZEN_WITHDRAWAL_ID,
        instanceId,
        caught: false,
      },
    },
  };

  return { genuine, trap };
}
