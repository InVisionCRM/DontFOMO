/**
 * messages.test.ts — unit tests for the Messages engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addConversation,
  addConversationMessage,
  contactInitials,
  findConversation,
  lastMessage,
  markConversationRead,
  previewText,
  totalUnreadCount,
  type Conversation,
  type MessageItem,
} from '../src/engine/messages/messages';

const conv = (
  id: string,
  unreadCount: number,
  extra: Partial<Conversation> = {},
): Conversation => ({
  id,
  contactName: id,
  avatarGradient: ['#000', '#fff'],
  unreadCount,
  messages: [],
  ...extra,
});

const txt = (id: string, outgoing: boolean, text = 't'): MessageItem => ({
  id,
  text,
  sentAt: 1,
  outgoing: outgoing || undefined,
});

describe('totalUnreadCount', () => {
  it('sums unread across conversations', () => {
    expect(totalUnreadCount([conv('a', 1), conv('b', 0), conv('c', 4)])).toBe(5);
  });
  it('is zero on an empty list', () => {
    expect(totalUnreadCount([])).toBe(0);
  });
});

describe('findConversation', () => {
  it('finds by id', () => {
    const convs = [conv('a', 0), conv('b', 0)];
    expect(findConversation(convs, 'b')?.id).toBe('b');
    expect(findConversation(convs, 'nope')).toBeUndefined();
  });
});

describe('lastMessage', () => {
  it('returns the tail message, or undefined', () => {
    expect(lastMessage(conv('a', 0))).toBeUndefined();
    const filled = conv('b', 0, { messages: [txt('1', false), txt('2', true)] });
    expect(lastMessage(filled)?.id).toBe('2');
  });
});

describe('previewText', () => {
  it('returns "No messages yet" for an empty thread', () => {
    expect(previewText(conv('a', 0))).toBe('No messages yet');
  });
  it('returns the last text message body', () => {
    const c = conv('a', 0, { messages: [txt('1', false, 'hi there')] });
    expect(previewText(c)).toBe('hi there');
  });
  it('collapses a link bubble to its title', () => {
    const c = conv('a', 0, {
      messages: [
        {
          id: 'l',
          sentAt: 1,
          link: { url: 'evil.app', title: 'Claim reward' },
        },
      ],
    });
    expect(previewText(c)).toBe('Claim reward');
  });
});

describe('markConversationRead', () => {
  it('zeros the unread count for the matching id', () => {
    const before = [conv('a', 4), conv('b', 1)];
    const after = markConversationRead(before, 'a');
    expect(after.find((c) => c.id === 'a')?.unreadCount).toBe(0);
    expect(after.find((c) => c.id === 'b')?.unreadCount).toBe(1);
  });
  it('preserves the same conversation reference when already read', () => {
    const before = [conv('a', 0)];
    const after = markConversationRead(before, 'a');
    expect(after[0]).toBe(before[0]);
  });
  it('is pure', () => {
    const before = [conv('a', 3)];
    markConversationRead(before, 'a');
    expect(before[0].unreadCount).toBe(3);
  });
});

describe('addConversationMessage', () => {
  it('appends incoming and bumps unread', () => {
    const before = [conv('a', 2, { messages: [txt('1', false)] })];
    const after = addConversationMessage(before, 'a', txt('2', false));
    expect(after[0].messages).toHaveLength(2);
    expect(after[0].unreadCount).toBe(3);
  });

  it('appends outgoing without bumping unread', () => {
    const before = [conv('a', 5)];
    const after = addConversationMessage(before, 'a', txt('out-1', true));
    expect(after[0].messages).toHaveLength(1);
    expect(after[0].unreadCount).toBe(5);
  });

  it('is a no-op for unknown id', () => {
    const before = [conv('a', 0)];
    expect(addConversationMessage(before, 'nope', txt('1', false))).toEqual(before);
  });
});

describe('addConversation', () => {
  it('prepends — newest first', () => {
    const before = [conv('a', 0)];
    const after = addConversation(before, conv('b', 1));
    expect(after.map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('contactInitials', () => {
  it('first letter of one-or-two words, uppercase', () => {
    expect(contactInitials('Jordan')).toBe('J');
    expect(contactInitials('John Smith')).toBe('JS');
    expect(contactInitials('mom')).toBe('M');
  });
  it('handles empty / whitespace input', () => {
    expect(contactInitials('')).toBe('?');
    expect(contactInitials('   ')).toBe('?');
  });
});
