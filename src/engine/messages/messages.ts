/**
 * messages.ts — the Messages (real friends) app data model + helpers.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * Messages is Bible §5's contact app — DMs with people the player
 * knows. It's separate from Tunnel (crypto-community chats) so the
 * scam vectors stay distinct: Tunnel hosts duplicate-channel and
 * fake-support phishes; Messages hosts the **Hijacked Friend**
 * (Scam Library #9) — a trusted contact whose account has been
 * compromised, escalating from normal small-talk to "click this
 * link / send me money."
 *
 * The `isSuspicious` flag marks a conversation whose contact is
 * currently hijacked. The Scam Director (Stage 6) will flip this
 * on as it spawns the scam thread.
 */

/** Avatar gradient — top-left to bottom-right colour pair. */
export type AvatarGradient = readonly [string, string];

/** Optional link preview rendered as a "card" bubble. */
export interface MessageLink {
  /** The displayed URL (also the apparent destination). */
  url: string;
  /** Preview headline shown under the URL. */
  title: string;
  /** Optional thumbnail gradient — no image fetch in v1. */
  thumbnailGradient?: AvatarGradient;
}

/**
 * One item inside a conversation. Either a text bubble OR a link
 * preview — never both in v1.
 */
export interface MessageItem {
  id: string;
  /** Body of a text bubble. Omit when `link` is set. */
  text?: string;
  /** Link preview card. Omit when `text` is set. */
  link?: MessageLink;
  /** Epoch ms. */
  sentAt: number;
  /** True when the message was sent by the player. */
  outgoing?: boolean;
}

/** One conversation thread in the Messages list. */
export interface Conversation {
  id: string;
  /** Contact's display name. */
  contactName: string;
  /** Avatar gradient — used in the row and the detail header. */
  avatarGradient: AvatarGradient;
  /** Initials override; otherwise computed from `contactName`. */
  initials?: string;
  /**
   * The contact's account has been compromised (Hijacked Friend
   * scam). Drives the suspicious treatment in the UI. Inert in v1;
   * the Scam Director consumes this in Stage 6.
   */
  isSuspicious?: boolean;
  /** Messages, oldest first. */
  messages: MessageItem[];
  /** Unread count — bumps on incoming `addConversationMessage`. */
  unreadCount: number;
}

/** Sum unread across conversations — drives the app-icon badge. */
export function totalUnreadCount(
  conversations: readonly Conversation[],
): number {
  let n = 0;
  for (const c of conversations) n += c.unreadCount;
  return n;
}

/** Find one conversation by id, or undefined. */
export function findConversation(
  conversations: readonly Conversation[],
  id: string,
): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

/** Last message in a conversation (or undefined if empty). */
export function lastMessage(conv: Conversation): MessageItem | undefined {
  return conv.messages[conv.messages.length - 1];
}

/**
 * Plain-text preview for the row's bottom line. A link bubble
 * collapses to its title so the row stays readable.
 */
export function previewText(conv: Conversation): string {
  const last = lastMessage(conv);
  if (!last) return 'No messages yet';
  if (last.link) return last.link.title;
  return last.text ?? '';
}

/** Mark one conversation read; preserves the array reference if already read. */
export function markConversationRead(
  conversations: readonly Conversation[],
  id: string,
): Conversation[] {
  return conversations.map((c) =>
    c.id === id && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c,
  );
}

/**
 * Append a message to a conversation. Incoming bumps `unreadCount`;
 * outgoing doesn't. Returns a new array; no-op on unknown id.
 */
export function addConversationMessage(
  conversations: readonly Conversation[],
  convId: string,
  msg: MessageItem,
): Conversation[] {
  return conversations.map((c) => {
    if (c.id !== convId) return c;
    return {
      ...c,
      messages: [...c.messages, msg],
      unreadCount: msg.outgoing ? c.unreadCount : c.unreadCount + 1,
    };
  });
}

/** Prepend a fresh conversation (newest first). */
export function addConversation(
  conversations: readonly Conversation[],
  conv: Conversation,
): Conversation[] {
  return [conv, ...conversations];
}

/** First letter of the first one or two words, uppercase. */
export function contactInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  const first = words[0]?.[0] ?? '?';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}
