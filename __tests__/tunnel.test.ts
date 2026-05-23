/**
 * tunnel.test.ts — unit tests for the Tunnel engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addTunnelChat,
  addTunnelMessage,
  chatInitials,
  findTunnelChat,
  lastMessage,
  markChatRead,
  senderColour,
  totalUnreadCount,
  type TunnelChat,
  type TunnelMessage,
} from '../src/engine/tunnel/tunnel';

const chat = (
  id: string,
  unreadCount: number,
  extra: Partial<TunnelChat> = {},
): TunnelChat => ({
  id,
  name: 'Chat ' + id,
  avatarGradient: ['#000', '#fff'],
  kind: 'channel',
  unreadCount,
  messages: [],
  ...extra,
});

const message = (
  id: string,
  outgoing: boolean,
  extra: Partial<TunnelMessage> = {},
): TunnelMessage => ({
  id,
  sender: outgoing ? undefined : 'someone',
  text: 't',
  sentAt: 1,
  outgoing: outgoing || undefined,
  ...extra,
});

describe('totalUnreadCount', () => {
  it('sums unread across chats', () => {
    expect(
      totalUnreadCount([chat('a', 3), chat('b', 0), chat('c', 8)]),
    ).toBe(11);
  });
  it('is zero for an empty list', () => {
    expect(totalUnreadCount([])).toBe(0);
  });
});

describe('findTunnelChat / lastMessage', () => {
  it('finds by id', () => {
    const chats = [chat('a', 0), chat('b', 0)];
    expect(findTunnelChat(chats, 'b')?.id).toBe('b');
    expect(findTunnelChat(chats, 'nope')).toBeUndefined();
  });
  it('lastMessage returns the tail message or undefined', () => {
    const empty = chat('a', 0);
    const filled = chat('b', 0, {
      messages: [message('1', false), message('2', false)],
    });
    expect(lastMessage(empty)).toBeUndefined();
    expect(lastMessage(filled)?.id).toBe('2');
  });
});

describe('markChatRead', () => {
  it('zeros the unread count for the matching id', () => {
    const before = [chat('a', 5), chat('b', 3)];
    const after = markChatRead(before, 'a');
    expect(after.find((c) => c.id === 'a')?.unreadCount).toBe(0);
    expect(after.find((c) => c.id === 'b')?.unreadCount).toBe(3);
  });
  it('is a no-op for an unknown id', () => {
    const before = [chat('a', 5)];
    const after = markChatRead(before, 'nope');
    expect(after[0].unreadCount).toBe(5);
  });
  it('returns the same chat reference if already read', () => {
    // Implementation skips the rewrite when unreadCount is already 0,
    // which keeps Zustand snapshot equality stable.
    const before = [chat('a', 0)];
    const after = markChatRead(before, 'a');
    expect(after[0]).toBe(before[0]);
  });
  it('is pure — original unchanged', () => {
    const before = [chat('a', 5)];
    markChatRead(before, 'a');
    expect(before[0].unreadCount).toBe(5);
  });
});

describe('addTunnelMessage', () => {
  it('appends an incoming message and bumps unreadCount', () => {
    const before = [chat('a', 1, { messages: [message('1', false)] })];
    const after = addTunnelMessage(before, 'a', message('2', false));
    expect(after[0].messages).toHaveLength(2);
    expect(after[0].unreadCount).toBe(2);
  });

  it('appends an outgoing message without bumping unread', () => {
    const before = [chat('a', 3)];
    const after = addTunnelMessage(before, 'a', message('out-1', true));
    expect(after[0].messages).toHaveLength(1);
    expect(after[0].unreadCount).toBe(3); // unchanged
  });

  it('is a no-op for an unknown chat id', () => {
    const before = [chat('a', 0)];
    const after = addTunnelMessage(before, 'nope', message('1', false));
    expect(after).toEqual(before);
  });

  it('is pure — original chat array unchanged', () => {
    const before = [chat('a', 0)];
    addTunnelMessage(before, 'a', message('1', false));
    expect(before[0].messages).toHaveLength(0);
    expect(before[0].unreadCount).toBe(0);
  });
});

describe('addTunnelChat', () => {
  it('prepends — newest first', () => {
    const before = [chat('a', 0)];
    const after = addTunnelChat(before, chat('b', 1));
    expect(after.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('chatInitials', () => {
  it('first letter of the first two words', () => {
    expect(chatInitials('MoonPig Community')).toBe('MC');
    expect(chatInitials('DeFi Degens')).toBe('DD');
  });
  it('falls back to single-letter for one-word names', () => {
    expect(chatInitials('Sarah')).toBe('S');
  });
  it('handles empty input', () => {
    expect(chatInitials('')).toBe('?');
    expect(chatInitials('   ')).toBe('?');
  });
});

describe('senderColour', () => {
  it('is deterministic — same name → same colour', () => {
    expect(senderColour('frog_anon')).toBe(senderColour('frog_anon'));
  });
  it('returns a value from the fixed palette (#rrggbb)', () => {
    expect(senderColour('chartfairy')).toMatch(/^#[0-9A-F]{6}$/);
  });
});
