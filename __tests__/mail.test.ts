/**
 * mail.test.ts — unit tests for the Mail engine.
 * ------------------------------------------------------------------
 * Pure logic, no React Native, no device — ts-jest harness.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addMessage,
  deleteMessage,
  findMessage,
  markRead,
  senderInitials,
  unreadCount,
  type MailMessage,
} from '../src/engine/mail/mail';

const msg = (
  id: string,
  unread: boolean,
  extra: Partial<MailMessage> = {},
): MailMessage => ({
  id,
  from: 'Someone',
  fromAddress: 's@example.com',
  subject: 's',
  preview: 'p',
  body: 'b',
  arrivedAt: 1,
  unread,
  ...extra,
});

describe('unreadCount', () => {
  it('counts only unread messages', () => {
    const msgs = [msg('a', true), msg('b', false), msg('c', true), msg('d', false)];
    expect(unreadCount(msgs)).toBe(2);
  });

  it('is zero for an empty inbox', () => {
    expect(unreadCount([])).toBe(0);
  });
});

describe('markRead', () => {
  it('flips unread → read for the matching id', () => {
    const before = [msg('a', true), msg('b', true)];
    const after = markRead(before, 'a');
    expect(after.find((m) => m.id === 'a')?.unread).toBe(false);
    expect(after.find((m) => m.id === 'b')?.unread).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    const before = [msg('a', true)];
    const after = markRead(before, 'nope');
    expect(after).toHaveLength(1);
    expect(after[0].unread).toBe(true);
  });

  it('is pure — original array unchanged', () => {
    const before = [msg('a', true)];
    markRead(before, 'a');
    expect(before[0].unread).toBe(true);
  });
});

describe('addMessage', () => {
  it('prepends — newest first', () => {
    const before = [msg('a', false)];
    const after = addMessage(before, msg('b', true));
    expect(after.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('deleteMessage', () => {
  it('removes the matching id', () => {
    const before = [msg('a', false), msg('b', true), msg('c', false)];
    const after = deleteMessage(before, 'b');
    expect(after.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('is a no-op for an unknown id', () => {
    const before = [msg('a', false)];
    expect(deleteMessage(before, 'nope')).toEqual(before);
  });
});

describe('findMessage', () => {
  it('returns the match, or undefined', () => {
    const msgs = [msg('a', true), msg('b', false)];
    expect(findMessage(msgs, 'b')?.id).toBe('b');
    expect(findMessage(msgs, 'nope')).toBeUndefined();
  });
});

describe('senderInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(senderInitials('Account Security')).toBe('AS');
    expect(senderInitials("Bank of DON'T FOMO")).toBe('BO');
  });

  it('handles single-word senders', () => {
    expect(senderInitials('Marcus')).toBe('M');
  });

  it('handles empty/whitespace input', () => {
    expect(senderInitials('')).toBe('?');
    expect(senderInitials('   ')).toBe('?');
  });

  it('always returns uppercase', () => {
    expect(senderInitials('account security')).toBe('AS');
  });
});
