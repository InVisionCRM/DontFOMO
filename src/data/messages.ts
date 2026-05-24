/**
 * messages.ts — the seed Messages conversations for a fresh game.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). Mix of normal friend/family DMs and one
 * early-game Hijacked Friend primer (Bible §11 / Scam Library #9)
 * — "Jordan" used to be a normal contact and is currently sending
 * the classic compromised-account script: airdrop link, urgency,
 * pressure to connect a wallet.
 */
import type { Conversation } from '../engine/messages';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function createStartingMessages(now: number): Conversation[] {
  return [
    {
      id: 'sarah-msgs',
      contactName: 'Sarah',
      avatarGradient: ['#EC4899', '#BE185D'],
      unreadCount: 0,
      messages: [
        {
          id: 's-1',
          text: 'hey, you free this weekend',
          sentAt: now - 1 * DAY - 4 * HOUR,
        },
        {
          id: 's-2',
          text: "yeah probably, what's up",
          sentAt: now - 1 * DAY - 3 * HOUR,
          outgoing: true,
        },
        {
          id: 's-3',
          text: 'haha yeah exactly that',
          sentAt: now - 41 * MIN,
        },
      ],
    },
    {
      id: 'marcus-msgs',
      contactName: 'Marcus',
      avatarGradient: ['#8B5CF6', '#6D28D9'],
      unreadCount: 0,
      messages: [
        {
          id: 'm-1',
          text: 'how are you holding through this dip',
          sentAt: now - 1 * DAY - 6 * HOUR,
        },
        {
          id: 'm-2',
          text: 'fine, still in. you?',
          sentAt: now - 1 * DAY - 5 * HOUR,
          outgoing: true,
        },
        {
          id: 'm-3',
          text: 'you around later? wanna talk that VOLT play',
          sentAt: now - 5 * HOUR,
        },
      ],
    },
    {
      // The hijacked-friend primer (Bible §11). Starts normal,
      // turns sketchy mid-thread, ends with the classic
      // "connect-your-wallet" link.
      id: 'jordan-msgs',
      contactName: 'Jordan',
      avatarGradient: ['#22C55E', '#15803D'],
      isSuspicious: true,
      unreadCount: 3,
      messages: [
        {
          id: 'j-1',
          text: 'yo did you watch the game last night',
          sentAt: now - 2 * DAY - 5 * HOUR,
        },
        {
          id: 'j-2',
          text: 'nah missed it, any good?',
          sentAt: now - 2 * DAY - 4 * HOUR,
          outgoing: true,
        },
        {
          id: 'j-3',
          text: 'insane finish. anyway you still trading?',
          sentAt: now - 2 * DAY - 3 * HOUR,
        },
        {
          id: 'j-4',
          text: 'a little. slow week tbh',
          sentAt: now - 2 * DAY - 2 * HOUR,
          outgoing: true,
        },
        {
          id: 'j-5',
          text: "BRO. i just found this airdrop site, they're giving away $5,000 to anyone who connects a wallet",
          sentAt: now - 1 * DAY - 22 * HOUR,
        },
        {
          id: 'j-6',
          text: 'i already claimed mine. you have to do it before it ends tonight',
          sentAt: now - 1 * DAY - 21 * HOUR,
        },
        {
          id: 'j-7',
          link: {
            url: 'free-airdrop-claim.live',
            title: 'Claim your $5,000 wallet reward',
            thumbnailGradient: ['#3B2A6E', '#7C3AED'],
          },
          sentAt: now - 1 * DAY - 21 * HOUR + 30 * 1000,
        },
        {
          id: 'j-8',
          text: 'just connect your wallet, it is free money. trust me',
          sentAt: now - 1 * DAY - 20 * HOUR,
        },
      ],
    },
    {
      id: 'dad-msgs',
      contactName: 'Dad',
      avatarGradient: ['#3B82F6', '#1D4ED8'],
      unreadCount: 0,
      messages: [
        {
          id: 'd-1',
          text: 'call your mother',
          sentAt: now - 1 * DAY - 8 * HOUR,
        },
      ],
    },
    {
      id: 'mom-msgs',
      contactName: 'Mom',
      avatarGradient: ['#F59E0B', '#B45309'],
      unreadCount: 0,
      messages: [
        {
          id: 'mm-1',
          text: 'did you eat today',
          sentAt: now - 3 * DAY,
        },
      ],
    },
  ];
}
