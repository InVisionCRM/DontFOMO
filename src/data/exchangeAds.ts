/**
 * exchangeAds.ts — the Exchange "Sponsored" ad creatives.
 * ------------------------------------------------------------------
 * Parody crypto-ad copy, each shilling a listed token. Stored as DATA
 * (CLAUDE.md §5). The ad banner rotates through these. Pure data.
 */
export interface ExchangeAd {
  /** The token this ad shills — tapping the ad opens it. */
  tokenId: string;
  /** The parody ad headline. */
  headline: string;
}

export const EXCHANGE_ADS: readonly ExchangeAd[] = [
  {
    tokenId: 'MOONP',
    headline: "A pig is going to the moon. Get on board, or stay NGMI.",
  },
  {
    tokenId: 'GIGA',
    headline: "GigaChad holders don't check the chart. The chart checks them.",
  },
  {
    tokenId: 'YIELDX',
    headline: "4,000% APY. Your bank is legally not allowed to be this fun.",
  },
  {
    tokenId: 'PEPE2',
    headline: "Pepe 2.0 — the original rugged. This one definitely won't. Probably.",
  },
  {
    tokenId: 'NEURA',
    headline: "We put AI on the blockchain. Please don't ask which part.",
  },
  {
    tokenId: 'VOLT',
    headline: "VoltChain does 100,000 transactions a second. Be one of the twelve.",
  },
];

/** Constant fine print stamped on every ad. */
export const AD_FINE_PRINT = "Not financial advice. (It's financial advice.)";
