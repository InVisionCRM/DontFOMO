/**
 * scamTeachings.ts — friend-voice post-scam content.
 * ------------------------------------------------------------------
 * Pure data (CLAUDE.md §5). Every scam in the catalogue carries two
 * teaching threads — one for the caught path (vigilance reward, the
 * player avoided the trap), one for the fell-for path (the trap
 * detonated). The Director emits an effect; the store appends the
 * matching thread into the named Messages conversation.
 *
 * Voice rules (per KG):
 *  - From a trader friend, not from a system bot.
 *  - "Hey, I looked into it — looks like you [did X]. lesson is [Y]."
 *  - On a fall-for, blame-shield the player and end with hope.
 *  - On a caught, give a quiet "respect" — not a celebration.
 */

/** A line in a teaching thread. The store stamps `sentAt` at runtime. */
export interface TeachingLine {
  /** Stable id suffix — combined with the instance id at runtime. */
  idSuffix: string;
  text: string;
}

/** Two threads per scam — keyed by outcome. */
export interface ScamTeaching {
  /** Conversation id in the Messages list (e.g. 'marcus-msgs'). */
  contactConversationId: string;
  /** Sent when the player caught the scam (defused / refused). */
  caught: readonly TeachingLine[];
  /** Sent when the scam detonated. */
  fellFor: readonly TeachingLine[];
}

/**
 * Teachings keyed by `ScamEventDef.id`. Adding a scam? Add an entry
 * here in the same PR — the store warns if a teaching is missing.
 */
export const SCAM_TEACHINGS: Record<string, ScamTeaching> = {
  'authority-notice': {
    contactConversationId: 'marcus-msgs',
    caught: [
      {
        idSuffix: 'caught-1',
        text: "saw your bank cleared. you opened the one from notices@bank.com and ignored the other. nice.",
      },
      {
        idSuffix: 'caught-2',
        text: "tells were all there if you looked. your bank never asks for crypto to release a hold. and the lock screen printed the real address — match it character for character.",
      },
      {
        idSuffix: 'caught-3',
        text: 'the other email was notices@bannk.com — double-n in the domain. one letter off is how most bank phish lands. classic typosquat.',
      },
      {
        idSuffix: 'caught-4',
        text: 'you matched against the address on the lock screen exactly. that habit will save you a lot of money. respect.',
      },
    ],
    fellFor: [
      {
        idSuffix: 'fell-1',
        text: 'hey — i saw your bank balance hit zero. you ok?',
      },
      {
        idSuffix: 'fell-2',
        text: "looked into it. you tapped the email from notices@bannk.com — not notices@bank.com. same display name, wrong domain. the lock screen told you the real one.",
      },
      {
        idSuffix: 'fell-3',
        text: "lesson is brutal but it's universal: if the sender doesn't match the address your bank prints on its own app, it's not your bank. and 'final notice / 24 hours / pay in crypto' is the lever because urgency makes people stop reading.",
      },
      {
        idSuffix: 'fell-4',
        text: "your crypto and your stuff are still here. cashSwipe, rug radar, the thursday check — the floor is still there. you'll grind back. this one stings but it teaches.",
      },
    ],
  },

  'frozen-withdrawal': {
    contactConversationId: 'marcus-msgs',
    caught: [
      {
        idSuffix: 'caught-1',
        text: 'saw your withdrawal clear. you waited on the real bank email instead of panicking. smart.',
      },
      {
        idSuffix: 'caught-2',
        text: "the other message was notices@bannk.com — double-n in the domain. your bank's lock screen said notices@bank.com. one character off is the oldest trick.",
      },
      {
        idSuffix: 'caught-3',
        text: "nobody legitimate asks you to pay crypto upfront to release your own money. fees get taken from the transfer, not invoiced separately with a countdown.",
      },
      {
        idSuffix: 'caught-4',
        text: 'boring was correct. the transfer finished and you kept the rest of your cash. respect.',
      },
    ],
    fellFor: [
      {
        idSuffix: 'fell-1',
        text: 'hey — your bank balance just got wiped. you ok?',
      },
      {
        idSuffix: 'fell-2',
        text: "you paid the 'release fee' from notices@bannk.com. real bank was notices@bank.com — same name on the envelope, wrong domain.",
      },
      {
        idSuffix: 'fell-3',
        text: "advance-fee fraud. they dangled money you already started moving so you'd pay to 'unstick' it. classic sunk-cost play.",
      },
      {
        idSuffix: 'fell-4',
        text: "crypto and your stuff are still here — they only hit bank cash. cashSwipe + rug radar still work. you'll rebuild. painful lesson though.",
      },
    ],
  },

  'golden-giveaway': {
    contactConversationId: 'marcus-msgs',
    caught: [
      {
        idSuffix: 'caught-1',
        text: "saw the 'vance reiter' giveaway take over your clout. you sat it out. good.",
      },
      {
        idSuffix: 'caught-2',
        text: "tells were loud — handle was @vancereiter_eth (the real one is just @vancereiter, no suffix), account was 3 days old, and the whole pitch was 'send first, receive double.' no real giveaway ever works that way.",
      },
      {
        idSuffix: 'caught-3',
        text: "verified checkmarks are a paint job. you can buy one, you can fake one, a clone can wear one. the real check is going to the founder's actual account by hand and seeing what's pinned there. you did that. respect.",
      },
    ],
    fellFor: [
      {
        idSuffix: 'fell-1',
        text: 'oh no... saw your wallet move. you sent eth to the giveaway contract didn\'t you',
      },
      {
        idSuffix: 'fell-2',
        text: "looked into it. that was @vancereiter_eth — 3 days old, 412 followers, gold check. the real vance is @vancereiter (no suffix, joined 2019, 1.4M followers). his pinned tweet literally says 'I will NEVER run send-to-receive giveaways.'",
      },
      {
        idSuffix: 'fell-3',
        text: "the rule once and for all: if a giveaway asks you to send crypto first, it's a scam. always. doesn't matter how official the account looks. real founders don't double your money.",
      },
      {
        idSuffix: 'fell-4',
        text: "bank's fine, most of your crypto is fine — the scammer only took what you sent. cashSwipe + rug radar + the thursday check are still there. you'll claw it back. this one stings but everybody learns it once.",
      },
    ],
  },

  'clipboard-scam': {
    contactConversationId: 'marcus-msgs',
    caught: [
      {
        idSuffix: 'caught-1',
        text: 'yo — saw you cleared that recovery phrase off your clipboard. good instinct.',
      },
      {
        idSuffix: 'caught-2',
        text: 'real wallets get drained that way constantly. anything copied on a phone sits in clipboard history. any app you install can scrape it later.',
      },
      {
        idSuffix: 'caught-3',
        text: "you saw the badge, you went looking, you killed it. that's literally the difference between people who keep their crypto and people who don't.",
      },
      {
        idSuffix: 'caught-4',
        text: 'respect.',
      },
    ],
    fellFor: [
      {
        idSuffix: 'fell-1',
        text: 'man... checked the chain. your wallet got cleaned out.',
      },
      {
        idSuffix: 'fell-2',
        text: 'i looked into it. you copied your seed phrase during wallet setup. that copy sat in your clipboard history. a drainer scraped it the next time it ran. nothing you did after that mattered — they had the keys.',
      },
      {
        idSuffix: 'fell-3',
        text: 'lesson is brutal but simple: never copy a seed phrase. ever. wallets want you to type them by hand for exactly this reason.',
      },
      {
        idSuffix: 'fell-4',
        text: "cash is still good, bank's untouched. cashSwipe and the thursday check are still there. we'll get you back up.",
      },
    ],
  },
};

/** Look up a scam's teaching threads. Undefined if missing. */
export function findScamTeaching(defId: string): ScamTeaching | undefined {
  return SCAM_TEACHINGS[defId];
}
