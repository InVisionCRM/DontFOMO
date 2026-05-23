/**
 * tunnel.ts — the Tunnel (chat) app's data model and pure helpers.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Tunnel is Bible §5's chat app — communities, friends, and DM
 * threads — plus the dark twin: duplicate-channel impersonation and
 * fake "support" DMs. The model is intentionally small: each chat
 * carries its identity + the in-order message list + an unread
 * count. The Scam Director (Stage 6) will push messages and spawn
 * suspicious chats through `addTunnelMessage` and `addTunnelChat`.
 */

/** Avatar gradient — top-left to bottom-right colour pair. */
export type AvatarGradient = readonly [string, string];

/** One message inside a Tunnel chat. */
export interface TunnelMessage {
  id: string;
  /** Sender display name. Omit for an outgoing (player's own) message. */
  sender?: string;
  /** Body — plain text in v1. */
  text: string;
  /** Epoch ms. */
  sentAt: number;
  /** True when the message was sent by the player. */
  outgoing?: boolean;
}

/** Channel (broadcast community) vs DM (one-on-one with a contact). */
export type TunnelChatKind = 'channel' | 'dm';

/** One conversation in the Tunnel list. */
export interface TunnelChat {
  id: string;
  /** Display name (channel name or contact name). */
  name: string;
  /** Avatar initials. Computed if omitted. */
  initials?: string;
  /** Avatar gradient — used in the row and the detail header. */
  avatarGradient: AvatarGradient;
  kind: TunnelChatKind;
  /** Channels only — used in the detail subtitle. */
  memberCount?: number;
  /** Channels only — "online now" companion count. */
  onlineCount?: number;
  /** Shows the verified-checkmark badge next to the name. */
  verified?: boolean;
  /**
   * Phishing / scam / impersonation flag. Drives a red unread badge
   * and the SUSPICIOUS chip in the detail header. (Inert in v1; the
   * Scam Director consumes this in Stage 6.)
   */
  isSuspicious?: boolean;
  /** Optional pinned message rendered in the detail header bar. */
  pinned?: string;
  /** Messages, oldest first. */
  messages: TunnelMessage[];
  /** Unread count — bumps on `addTunnelMessage`, zeroed on open. */
  unreadCount: number;
}

/** Sum unread across all chats — drives the Tunnel app-icon badge. */
export function totalUnreadCount(chats: readonly TunnelChat[]): number {
  let n = 0;
  for (const c of chats) n += c.unreadCount;
  return n;
}

/** Find one chat by id, or undefined. */
export function findTunnelChat(
  chats: readonly TunnelChat[],
  id: string,
): TunnelChat | undefined {
  return chats.find((c) => c.id === id);
}

/** The last message in a chat (or undefined if the thread is empty). */
export function lastMessage(chat: TunnelChat): TunnelMessage | undefined {
  return chat.messages[chat.messages.length - 1];
}

/** Mark one chat as fully read; returns a new chats array. */
export function markChatRead(
  chats: readonly TunnelChat[],
  id: string,
): TunnelChat[] {
  return chats.map((c) =>
    c.id === id && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c,
  );
}

/**
 * Append a message to a chat. Incoming messages bump `unreadCount`;
 * outgoing messages don't (the player is the sender). Returns a new
 * chats array; no-op if the chat id is unknown.
 */
export function addTunnelMessage(
  chats: readonly TunnelChat[],
  chatId: string,
  msg: TunnelMessage,
): TunnelChat[] {
  return chats.map((c) => {
    if (c.id !== chatId) return c;
    return {
      ...c,
      messages: [...c.messages, msg],
      unreadCount: msg.outgoing ? c.unreadCount : c.unreadCount + 1,
    };
  });
}

/** Prepend a new chat to the list (newest first). */
export function addTunnelChat(
  chats: readonly TunnelChat[],
  chat: TunnelChat,
): TunnelChat[] {
  return [chat, ...chats];
}

/** Two-letter initials of a chat/sender name, e.g. "MP" for "MoonPig". */
export function chatInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  const first = words[0]?.[0] ?? '?';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

/**
 * Deterministic Telegram-style sender colour for an incoming-message
 * sender name. Same name → same colour every time.
 */
const SENDER_COLOURS = [
  '#7CB5E8',
  '#E88FC0',
  '#8CE0A8',
  '#E8C07C',
  '#A78BFA',
  '#5EB5F7',
  '#FB923C',
  '#94E3B1',
] as const;

export function senderColour(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return SENDER_COLOURS[Math.abs(h) % SENDER_COLOURS.length];
}
