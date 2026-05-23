/**
 * mail.ts — the Mail app's message model and pure helpers.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5).
 *
 * A `MailMessage` is the unit the inbox displays — a simple,
 * serialisable record. The Mail app stores an ordered list of these
 * in the game store (newest first). Helpers here mutate by returning
 * new arrays, so the store stays referentially immutable.
 *
 * The `isSuspicious` flag is the engine's hook for phishing-style
 * messages — the inbox row shows a red SUSPICIOUS tag and the detail
 * view treats the sender colour as a danger signal. The Scam
 * Director (Stage 6) will spawn messages with this flag set.
 */

/** Optional action button rendered inside the body of a mail. */
export interface MailAction {
  label: string;
  /** Semantic kind — drives colour and (later) the consequence engine. */
  kind: 'phish' | 'safe' | 'info';
}

/** A single mail in the player's inbox. */
export interface MailMessage {
  /** Stable id — used to mark read, delete, etc. */
  id: string;
  /** Display name shown in the inbox row and the detail header. */
  from: string;
  /** Email address shown in the detail header — gives away phish. */
  fromAddress: string;
  /** Subject line. */
  subject: string;
  /** Short single-line preview for the inbox row. */
  preview: string;
  /**
   * Full body. Paragraphs separated by `\n\n`. Inline links are not
   * supported in v1 — the optional `action` is the only interactive
   * element inside the body.
   */
  body: string;
  /** When the message arrived (epoch ms). */
  arrivedAt: number;
  /** True until the player opens it. */
  unread: boolean;
  /** Phishing / scam flag — surfaces the SUSPICIOUS tag in the UI. */
  isSuspicious?: boolean;
  /** Optional in-body action button. Inert in v1; wired in Stage 6. */
  action?: MailAction;
}

/** Count of unread messages — drives the inbox header and the icon badge. */
export function unreadCount(messages: readonly MailMessage[]): number {
  let n = 0;
  for (const m of messages) if (m.unread) n += 1;
  return n;
}

/** Mark one message as read; returns a new array. */
export function markRead(
  messages: readonly MailMessage[],
  id: string,
): MailMessage[] {
  return messages.map((m) => (m.id === id ? { ...m, unread: false } : m));
}

/** Prepend a new message (newest-first ordering); returns a new array. */
export function addMessage(
  messages: readonly MailMessage[],
  msg: MailMessage,
): MailMessage[] {
  return [msg, ...messages];
}

/** Remove a message by id; returns a new array. */
export function deleteMessage(
  messages: readonly MailMessage[],
  id: string,
): MailMessage[] {
  return messages.filter((m) => m.id !== id);
}

/** Find one message by id, or undefined. */
export function findMessage(
  messages: readonly MailMessage[],
  id: string,
): MailMessage | undefined {
  return messages.find((m) => m.id === id);
}

/** Two-letter initials of a sender name, e.g. "AS" for "Account Security". */
export function senderInitials(sender: string): string {
  const trimmed = sender.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  const first = words[0]?.[0] ?? '?';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}
