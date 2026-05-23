/**
 * playerToken.ts — player-created token logic.
 * ------------------------------------------------------------------
 * Pure TypeScript. No React imports (CLAUDE.md §5). The rules behind
 * the player launching their own token (Design Bible §9):
 *  - a player may ever create at most two tokens;
 *  - the first is free, the second's cost rises with days survived;
 *  - a player token's movement scales with the player's followers;
 *  - pumping (buying) it earns followers with diminishing returns;
 *  - dumping (selling) it loses followers, more so for big accounts.
 *
 * Every function here is pure and unit-tested.
 */
import { seedTokenState, type SimParams, type TokenMarketState } from '../market';

/** The maximum tokens a player may ever create. */
export const MAX_PLAYER_TOKENS = 2;

/** The price a freshly launched player token starts at. */
export const PLAYER_TOKEN_START_PRICE = 0.001;

/** A player-created token's identity. */
export interface PlayerTokenDef {
  /** Ticker — the stable id. */
  id: string;
  /** Display name. */
  name: string;
  /** The emoji logo the player chose. */
  emoji: string;
  /** Accent gradient — [from, to]. */
  gradient: readonly [string, string];
  /** The in-game day the token was launched. */
  launchedOnDay: number;
}

/** A newly created player token — its identity plus its market state. */
export interface NewPlayerToken {
  def: PlayerTokenDef;
  state: TokenMarketState;
}

/**
 * The cost, in cash, to launch the player's `launchNumber`-th token
 * (1-indexed). The first is free; the second's price rises the longer
 * the player has survived.
 */
export function tokenLaunchCost(
  launchNumber: number,
  daysSurvived: number,
): number {
  if (launchNumber <= 1) {
    return 0;
  }
  return 3000 + Math.max(0, daysSurvived) * 750;
}

/**
 * A player token's per-tick volatility, as a function of the player's
 * follower count. With no following the token is near-flat; it grows
 * livelier with followers, approaching a capped ceiling.
 */
export function followerVolatility(followers: number): number {
  const cap = 0.07;
  const safe = Math.max(0, followers);
  return cap * (safe / (safe + 400));
}

/** The sim parameters for a player token at a given follower count. */
export function playerTokenParams(followers: number): SimParams {
  return { drift: 0, volatility: followerVolatility(followers), isStable: false };
}

/**
 * Followers gained when the player pumps (buys) their own token.
 * Diminishing returns — a big boost when small, a small one when large
 * (Design Bible §9). Always at least one.
 */
export function followersFromPump(followers: number): number {
  const safe = Math.max(0, followers);
  return Math.max(1, Math.round(60 / (1 + safe / 250)));
}

/**
 * Followers lost when the player dumps (sells) their own token. The
 * loss scales with the account size — founder scrutiny: more was
 * expected of a big account (Design Bible §9).
 */
export function followersFromDump(followers: number): number {
  const safe = Math.max(0, followers);
  return Math.round(8 + safe * 0.06);
}

/**
 * Mint a new player token: its identity plus a fresh market state,
 * seeded near the starting price.
 */
export function createPlayerToken(
  params: {
    id: string;
    name: string;
    emoji: string;
    gradient: readonly [string, string];
  },
  day: number,
  rand: () => number,
): NewPlayerToken {
  const def: PlayerTokenDef = {
    id: params.id,
    name: params.name,
    emoji: params.emoji,
    gradient: params.gradient,
    launchedOnDay: day,
  };
  const state = seedTokenState(
    def.id,
    playerTokenParams(0),
    PLAYER_TOKEN_START_PRICE,
    rand,
  );
  return { def, state };
}
