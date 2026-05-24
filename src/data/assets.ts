/**
 * assets.ts — the Market catalogue.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). Nine assets across three tiers per
 * category — entry, mid, top — covering Cars, Watches, and Houses.
 * Prices, follower boosts and descriptions follow the approved
 * Market mockup; satirical tone preserved.
 */
import type { AssetDefinition } from '../engine/assets';

export const ASSET_CATALOG: readonly AssetDefinition[] = [
  // --- Cars ---
  {
    id: 'car-hatchback',
    name: 'City Hatchback',
    category: 'Cars',
    price: 24_000,
    followersBoost: 15,
    thumbGradient: ['#64748B', '#334155'],
    description:
      'Reliable, sensible, and deeply uncool. Gets you there. Nobody will ask about it. Nobody will ever ask about it.',
  },
  {
    id: 'car-sports-coupe',
    name: 'Sports Coupe',
    category: 'Cars',
    price: 140_000,
    followersBoost: 120,
    thumbGradient: ['#DC2626', '#7F1D1D'],
    description:
      'Loud, low, and impractical. Exactly the kind of poor decision the timeline respects. Doors open upward for no reason.',
  },
  {
    id: 'car-hypercar',
    name: 'Hypercar',
    category: 'Cars',
    price: 1_200_000,
    followersBoost: 850,
    thumbGradient: ['#F59E0B', '#B45309'],
    description:
      'A rolling flex with a top speed you will never legally use. Pure status. The engine alone has more followers than you.',
  },

  // --- Watches ---
  {
    id: 'watch-steel-diver',
    name: 'Steel Diver',
    category: 'Watches',
    price: 9_000,
    followersBoost: 40,
    thumbGradient: ['#0EA5E9', '#0C4A6E'],
    description:
      'Water resistant to depths you will never visit. A respectable first flex. Quietly says you have your life together.',
  },
  {
    id: 'watch-gold-chrono',
    name: 'Gold Chronograph',
    category: 'Watches',
    price: 52_000,
    followersBoost: 260,
    thumbGradient: ['#EAB308', '#854D0E'],
    description:
      'Heavy, golden, and impossible to ignore. Tells time. Mostly tells everyone else how you are doing.',
  },
  {
    id: 'watch-diamond',
    name: 'Diamond Piece',
    category: 'Watches',
    price: 480_000,
    followersBoost: 1_400,
    thumbGradient: ['#A5F3FC', '#0891B2'],
    description:
      'More carats than sense. Blinding under direct light. Wearing this is a personality and, frankly, a security risk.',
  },

  // --- Houses ---
  {
    id: 'house-studio',
    name: 'Studio Apartment',
    category: 'Houses',
    price: 180_000,
    followersBoost: 90,
    thumbGradient: ['#A78BFA', '#5B21B6'],
    description:
      'Cozy. Which is the word used when there is exactly one room. Still, an address is an address.',
  },
  {
    id: 'house-suburban',
    name: 'Suburban House',
    category: 'Houses',
    price: 720_000,
    followersBoost: 520,
    thumbGradient: ['#34D399', '#065F46'],
    description:
      'A lawn, a garage, and the crushing weight of a mortgage. The dream, allegedly. Has a room for a home gym you will not use.',
  },
  {
    id: 'house-villa',
    name: 'Beachfront Villa',
    category: 'Houses',
    price: 4_200_000,
    followersBoost: 3_200,
    thumbGradient: ['#22D3EE', '#0E7490'],
    description:
      'Ocean views, infinity pool, and a following to match. This is the screenshot people send each other. You have made it.',
  },
];
