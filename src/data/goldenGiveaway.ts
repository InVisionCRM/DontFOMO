/**
 * goldenGiveaway.ts — content data for the Golden Giveaway scam.
 * ------------------------------------------------------------------
 * Stage 6.5a / Scam Library v1.1 Event #10 (Inbound Lure, Clout).
 * Pure data (CLAUDE.md §5). The mockup at
 * `DontFOMO_ScamEvent_GoldenGiveaway_Mockup.html` is the spec.
 *
 * Single source of truth for the in-game canon the takeover renders:
 *  - the impersonated founder (real handle + verified, joined 2019,
 *    1.4M followers, with a pinned anti-scam tweet),
 *  - the clone account that lures the player (lookalike handle, brand
 *    new, fake-style gold check),
 *  - the doubler offer copy that appears in the takeover.
 *
 * Re-use rule: this canon (Vance Reiter / ApexChain) is reusable for
 * future impersonator variants without re-spec — change a handle here
 * and every scam that impersonates this founder updates together.
 *
 * Two exported pieces:
 *
 *   - `GOLDEN_GIVEAWAY_CANON` — the canonical strings.
 *
 *   - `buildGoldenGiveawayTakeover(instanceId, expiresAt)` — given an
 *     instance id and the auto-expiry epoch, returns the snapshot the
 *     store pins to `cloutTakeover`. Pinning a frozen snapshot at
 *     deploy time means renaming the canon later does not break
 *     in-flight instances.
 */

/**
 * The canon strings the Clout takeover and compare view render. Edit
 * one place; the takeover, the compare row, and every test that
 * checks copy follow.
 */
export const GOLDEN_GIVEAWAY_CANON = {
  /** Real (impersonated) founder. */
  real: {
    name: 'Vance Reiter',
    /** Including the leading "@". */
    handle: '@vancereiter',
    bio: "Founder, ApexChain. Building the chain you'd actually want your grandparents using.",
    joined: 'June 2019',
    followers: 1_400_000,
    /**
     * The pinned anti-scam tweet shown on the real founder's profile
     * row in the compare view. The answer key for the lure — read it,
     * report the clone, you're done.
     */
    pinnedTweet:
      'I will NEVER DM you, run send-to-receive giveaways, or ask you to "verify" your wallet. If you see a post claiming to be me asking for crypto first — it\'s a scam. Always.',
  },
  /** Fake clone — the lure. */
  fake: {
    name: 'Vance Reiter',
    handle: '@vancereiter_eth',
    bio: 'Founder, ApexChain. Mainnet upgrade live. Giving back today only.',
    joinedDaysAgo: 3,
    followers: 412,
  },
  /** The takeover post itself. */
  takeover: {
    /** Headline title — the doubler hook. */
    title: 'Sending 2× ETH back to the community.',
    /** Body copy under the title. */
    body:
      'To celebrate the ApexChain mainnet upgrade, the first 500 wallets that send 0.05 – 5 ETH to the verified contract will receive double back instantly. One transaction per wallet.',
    /** The wallet address shown in the confirmation sheet — flavour only. */
    contractAddress: '0xa1b2…c93f9',
    /** Fake-progress slug shown on the takeover. */
    claimedPercent: 78,
    walletsClaimed: 389,
    walletsTotal: 500,
    /** Suggested send amount preselected in the confirm sheet. */
    suggestedEthAmount: 0.5,
  },
} as const;

/**
 * The snapshot pinned to the store's `cloutTakeover` slot when the
 * Director arms a Golden Giveaway instance. Holds the live `expiresAt`
 * and the references the UI needs to render, frozen so a later canon
 * change can't break a live instance.
 */
export interface GoldenGiveawayTakeover {
  /** Catalog scam id — always `golden-giveaway` in 6.5a. */
  scamId: string;
  /** Live `ScamInstance.id` the takeover is tied to. */
  instanceId: string;
  /** Epoch ms after which the Director auto-resolves the instance. */
  expiresAt: number;
  /**
   * Frozen copy of the relevant canon strings. The UI reads these
   * exclusively (it does NOT import the canon directly) so a save
   * persisted today still renders correctly after a canon rename.
   */
  fakeHandle: string;
  fakeName: string;
  realHandle: string;
  realName: string;
  title: string;
  body: string;
  contractAddress: string;
  claimedPercent: number;
  walletsClaimed: number;
  walletsTotal: number;
  suggestedEthAmount: number;
}

/**
 * Build the takeover snapshot the store pins to `cloutTakeover`. Pure.
 */
export function buildGoldenGiveawayTakeover(
  instanceId: string,
  expiresAt: number,
): GoldenGiveawayTakeover {
  const c = GOLDEN_GIVEAWAY_CANON;
  return {
    scamId: 'golden-giveaway',
    instanceId,
    expiresAt,
    fakeHandle: c.fake.handle,
    fakeName: c.fake.name,
    realHandle: c.real.handle,
    realName: c.real.name,
    title: c.takeover.title,
    body: c.takeover.body,
    contractAddress: c.takeover.contractAddress,
    claimedPercent: c.takeover.claimedPercent,
    walletsClaimed: c.takeover.walletsClaimed,
    walletsTotal: c.takeover.walletsTotal,
    suggestedEthAmount: c.takeover.suggestedEthAmount,
  };
}
