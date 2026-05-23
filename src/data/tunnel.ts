/**
 * tunnel.ts — the seed Tunnel chats for a brand-new game.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). A small starter set: two verified meme-
 * coin communities, a duplicate-channel impersonation (the player's
 * early "spot the fake channel" primer per Bible §11), a fake
 * Tunnel-support DM phish, two friend DMs.
 *
 * The Scam Director (Stage 6) will push live messages and spawn new
 * suspicious chats over time.
 */
import type { TunnelChat } from '../engine/tunnel';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Seed Tunnel chats for a brand-new game. `now` anchors the message
 * timestamps so the chat list reads naturally on first launch.
 */
export function createStartingTunnel(now: number): TunnelChat[] {
  return [
    {
      id: 'moonpig-official',
      name: 'MoonPig Community',
      avatarGradient: ['#FB923C', '#EA580C'],
      kind: 'channel',
      memberCount: 12_402,
      onlineCount: 1_240,
      verified: true,
      pinned: 'Official yield farm this week → moonfarm.app',
      unreadCount: 8,
      messages: [
        {
          id: 'mp-1',
          sender: 'frog_anon',
          text: 'is the farm still paying out',
          sentAt: now - 13 * MIN,
        },
        {
          id: 'mp-2',
          sender: 'sarah',
          text: 'yeah 312% apr, link is in the pinned post. still open for now',
          sentAt: now - 9 * MIN,
        },
        {
          id: 'mp-3',
          sender: 'degen_max',
          text: 'aped. lets go',
          sentAt: now - 6 * MIN,
        },
        {
          id: 'mp-4',
          sender: 'chartfairy',
          text: 'be careful, the last farm rugged in like 9 days',
          sentAt: now - 4 * MIN,
        },
        {
          id: 'mp-5',
          sender: 'sarah',
          text: "this one's audited though. always dyor before you ape",
          sentAt: now - 1 * MIN,
        },
      ],
    },
    {
      id: 'moonp1g-fake',
      name: 'MoonP1g Community',
      avatarGradient: ['#FB923C', '#EA580C'],
      kind: 'channel',
      memberCount: 84,
      verified: false,
      isSuspicious: true,
      unreadCount: 3,
      messages: [
        {
          id: 'fake-1',
          sender: 'Admin',
          text: 'claim your airdrop before it closes — moonpig-airdrop.app',
          sentAt: now - 22 * MIN,
        },
        {
          id: 'fake-2',
          sender: 'Admin',
          text: 'only 240 spots left, connect your wallet to claim',
          sentAt: now - 18 * MIN,
        },
        {
          id: 'fake-3',
          sender: 'Admin',
          text: '⚠️ limited time, do not miss this!',
          sentAt: now - 14 * MIN,
        },
      ],
    },
    {
      id: 'defi-degens',
      name: 'DeFi Degens',
      avatarGradient: ['#06B6D4', '#0E7490'],
      kind: 'channel',
      memberCount: 4_881,
      onlineCount: 312,
      verified: true,
      unreadCount: 41,
      messages: [
        {
          id: 'dd-1',
          sender: 'chartfairy',
          text: 'ngmi vibes today honestly',
          sentAt: now - 2 * HOUR,
        },
      ],
    },
    {
      id: 'tunnel-support-fake',
      name: 'Tunnel Support',
      avatarGradient: ['#3390EC', '#2B6CB8'],
      kind: 'dm',
      isSuspicious: true,
      unreadCount: 1,
      messages: [
        {
          id: 'ts-1',
          sender: 'Tunnel Support',
          text: 'Your account will be limited soon. Verify within 24h to keep access: tunnel-verify.app',
          sentAt: now - 2 * HOUR,
        },
      ],
    },
    {
      id: 'marcus-dm',
      name: 'Marcus',
      avatarGradient: ['#8B5CF6', '#6D28D9'],
      kind: 'dm',
      unreadCount: 0,
      messages: [
        {
          id: 'marcus-1',
          sender: 'Marcus',
          text: 'you still in on that VOLT play?',
          sentAt: now - 5 * HOUR,
        },
        {
          id: 'marcus-2',
          text: 'still holding, chart looks fine',
          sentAt: now - 4 * HOUR,
          outgoing: true,
        },
        {
          id: 'marcus-3',
          sender: 'Marcus',
          text: 'nice, lmk if you sell',
          sentAt: now - 4 * HOUR + 5 * MIN,
        },
      ],
    },
    {
      id: 'sarah-dm',
      name: 'Sarah',
      avatarGradient: ['#EC4899', '#BE185D'],
      kind: 'dm',
      unreadCount: 0,
      messages: [
        {
          id: 'sarah-1',
          sender: 'Sarah',
          text: 'lol did you see the news today',
          sentAt: now - 1 * DAY,
        },
      ],
    },
  ];
}
