/**
 * playerTokenView.ts — presenting player tokens in the Exchange.
 * ------------------------------------------------------------------
 * The Exchange UI (TokenRow, HoldingRow, TokenDetail, TradeSheet) is
 * built around the catalogue `TokenDefinition` shape. Player-created
 * tokens carry a leaner `PlayerTokenDef`, so this helper widens one
 * into a display `TokenDefinition` — letting a player token flow
 * through every existing component unchanged.
 *
 * Pure display helpers — no React, no React Native imports.
 */
import {
  PLAYER_TOKEN_START_PRICE,
  type PlayerTokenDef,
} from '../../engine/economy';
import { PLAYER_TOKEN_ABOUT } from '../../data/launch';
import { TOKEN_BY_ID, type TokenDefinition } from '../../data/tokens';

/**
 * Widen a player token into a display `TokenDefinition`. The flavour
 * stats a brand-new player token genuinely has no data for (market
 * cap, 24h volume) read as a dash; its price comes from the live
 * market state, not from `basePrice`.
 */
export function playerTokenToDefinition(
  player: PlayerTokenDef,
): TokenDefinition {
  return {
    id: player.id,
    name: player.name,
    category: 'Meme',
    basePrice: PLAYER_TOKEN_START_PRICE,
    gradient: player.gradient,
    emoji: player.emoji,
    drift: 0,
    volatility: 0,
    isStable: false,
    marketCap: '—',
    volume24h: '—',
    liquidity: 'Thin',
    description: PLAYER_TOKEN_ABOUT,
  };
}

/**
 * Resolve any token id — catalogue or player-created — to a display
 * `TokenDefinition`. Returns `undefined` for an unknown id.
 */
export function resolveTokenDefinition(
  id: string,
  playerTokens: readonly PlayerTokenDef[],
): TokenDefinition | undefined {
  const catalogue = TOKEN_BY_ID[id];
  if (catalogue) {
    return catalogue;
  }
  const player = playerTokens.find((token) => token.id === id);
  return player ? playerTokenToDefinition(player) : undefined;
}
