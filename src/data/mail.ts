/**
 * mail.ts — the inbox the player starts a fresh game with.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). A small handful of seed mails — flavor
 * + an early-game phishing primer (security education from minute
 * one, per Bible §11 "every opportunity has a fake twin").
 *
 * The Scam Director (Stage 6) will add more dynamic mail over time.
 */

import type { MailMessage } from '../engine/mail';

/**
 * Seed the inbox for a brand-new game. `now` anchors the arrival
 * timestamps so the inbox times read naturally on first launch.
 */
export function createStartingMail(now: number): MailMessage[] {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  return [
    // Welcome — most recent, unread.
    {
      id: 'welcome-001',
      from: "DON'T FOMO Team",
      fromAddress: 'hello@dontfomo.app',
      subject: 'Welcome to DON’T FOMO',
      preview:
        "Two rules before you ape into anything. Tap to read — we'll keep it short.",
      body:
        "Hey — welcome aboard.\n\n" +
        "You're now living a crypto life on your phone. Bills come due, prices move all day, and a steady stream of “opportunities” will land in this inbox.\n\n" +
        "Two rules to start with:\n\n" +
        "1. Read who the email is actually from — not just the display name. A sender like “Account Security” means nothing if the address is no-reply@some-rando.com.\n\n" +
        "2. Anything urgent + asking you to click a button is suspicious. Real banks don't email you a button to verify in 24h.\n\n" +
        "Good luck out there. You're going to need it.",
      arrivedAt: now,
      unread: true,
    },

    // Early-game phishing primer — unread, suspicious tag visible.
    {
      id: 'phish-primer-001',
      from: 'Account Security',
      fromAddress: 'no-reply@exchange-verify.com',
      subject: 'Unusual sign-in detected on your account',
      preview:
        'We noticed a sign-in from a new device in another country. Verify within 24 hours.',
      body:
        'Dear valued customer,\n\n' +
        'We detected a sign-in to your Exchange account from a new device in another country. If this was not you, your funds may be at immediate risk.\n\n' +
        'To secure your account, you must verify your identity within 24 hours. Failure to do so will result in your account and all balances being suspended.\n\n' +
        'If you did not request this, no action is needed — but we strongly recommend verifying immediately. This is an automated message from the Exchange Security Team.',
      arrivedAt: now - HOUR,
      unread: true,
      isSuspicious: true,
      action: { label: 'Verify my account now', kind: 'phish' },
    },

    // Bank statement — unread, flavour.
    {
      id: 'bank-statement-001',
      from: "Bank of DON'T FOMO",
      fromAddress: 'statements@bankofdontfomo.com',
      subject: 'Your statement is ready',
      preview:
        'Account summary and upcoming bills. Pay early to avoid late fees.',
      body:
        'Your statement for the current cycle is now available.\n\n' +
        "Upcoming bills are listed in the Bank app. Pay before the due date to avoid the 1%-per-day late fee — it adds up faster than you'd think.\n\n" +
        "If you can't cover everything this cycle, the loan tiers are right there next to the bills. We're not going anywhere.",
      arrivedAt: now - 18 * HOUR,
      unread: true,
    },

    // Newsletter — read.
    {
      id: 'newsletter-001',
      from: "DON'T FOMO Weekly",
      fromAddress: 'weekly@dontfomo.app',
      subject: 'This week in degeneracy',
      preview:
        'The five rugs you missed, and the one you definitely did not.',
      body:
        "Welcome to this week's edition of the only crypto newsletter that doesn't pretend to be your financial advisor.\n\n" +
        "This week: five tokens went to zero, a “DeFi 2.0” protocol turned out to be DeFi 0.5, and one anon dev disappeared with everyone's liquidity. Same as last week, basically.\n\n" +
        "Stay safe, hold your seeds tightly, and remember: if it sounds too good to be true, it's probably a pyramid scheme run by someone you went to high school with.",
      arrivedAt: now - 2 * DAY,
      unread: false,
    },

    // Friend tip — read.
    {
      id: 'friend-marcus-001',
      from: 'Marcus',
      fromAddress: 'marcus@gmail.com',
      subject: 'that thing we talked about',
      preview:
        'hey did you ever look into that VOLT play? still think it has legs',
      body:
        "hey, you ever pull the trigger on that VOLT thing we talked about?\n\n" +
        "i'm not your financial advisor obviously but the chart's still looking strong. up like 14% since we last talked.\n\n" +
        "anyway no pressure. let me know if you want to grab a beer this weekend.",
      arrivedAt: now - 4 * DAY,
      unread: false,
    },
  ];
}
