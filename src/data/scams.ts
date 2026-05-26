/**
 * scams.ts — Scam Library v1.1 catalogue (Stage 6).
 * ------------------------------------------------------------------
 * Pure data. Four Slow Burn / social-engineering vectors the Scam
 * Director can arm. Gameplay wiring lives in `engine/scam-director/`.
 */
import type { ScamId } from '../engine/scam-director/catalog';

export interface ScamCatalogEntry {
  id: ScamId;
  /** Scam Library event label shown in teaching copy. */
  libraryRef: string;
  name: string;
  summary: string;
  /** Where the player typically encounters it. */
  surface: string;
}

export const SCAM_CATALOG: readonly ScamCatalogEntry[] = [
  {
    id: 'clipboard_seed',
    libraryRef: 'Event #5',
    name: 'Clipboard seed phrase',
    summary:
      'Recovery phrase copied during wallet setup sits in Clipboard history until something reads it.',
    surface: 'Onboarding → Clipboard',
  },
  {
    id: 'frozen_withdrawal',
    libraryRef: 'Event #2',
    name: 'Frozen withdrawal',
    summary:
      'A fake platform freezes your balance and demands a “verification” or tax fee before releasing funds.',
    surface: 'Bank → Withdraw',
  },
  {
    id: 'hijacked_friend',
    libraryRef: 'Event #9',
    name: 'Hijacked friend',
    summary:
      'A trusted contact’s account pushes an urgent airdrop link — the voice sounds right, the URL does not.',
    surface: 'Messages',
  },
  {
    id: 'fake_support',
    libraryRef: 'Event #4',
    name: 'Fake support DM',
    summary:
      'Impersonators pose as app support in Tunnel and ask you to “verify” via a phishing link.',
    surface: 'Tunnel',
  },
] as const;

export const SCAM_BY_ID: Record<ScamId, ScamCatalogEntry> = Object.fromEntries(
  SCAM_CATALOG.map((entry) => [entry.id, entry]),
) as Record<ScamId, ScamCatalogEntry>;
