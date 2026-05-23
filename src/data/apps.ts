/**
 * apps.ts — the in-game app catalogue.
 * ------------------------------------------------------------------
 * The 12 apps on the phone, stored as DATA (CLAUDE.md §5). Each entry
 * carries its display name, its icon glyph (a single SVG path), its
 * icon-tile gradient, and whether it lives in the dock or the grid.
 *
 * Pure data — no React, no React Native imports.
 */

/** Stable identifier for each in-game app. */
export type AppId =
  | 'clout'
  | 'exchange'
  | 'wallet'
  | 'tunnel'
  | 'news'
  | 'mail'
  | 'messages'
  | 'market'
  | 'bank'
  | 'cashswipe'
  | 'clipboard'
  | 'settings';

export interface AppDefinition {
  /** Stable id — the key, and what the store uses to track the open app. */
  id: AppId;
  /** Display name shown under the icon. */
  name: string;
  /** Single-path SVG glyph, drawn in a 24x24 viewBox, stroke style. */
  iconPath: string;
  /** Icon-tile gradient: [top-left colour, bottom-right colour]. */
  gradient: readonly [string, string];
  /** True = lives in the dock; false = lives in the home grid. */
  inDock: boolean;
}

export const APPS: readonly AppDefinition[] = [
  {
    id: 'clout',
    name: 'Clout',
    iconPath: 'M5 5L19 19M19 5L5 19',
    gradient: ['#48484A', '#1C1C1E'],
    inDock: true,
  },
  {
    id: 'exchange',
    name: 'Exchange',
    iconPath:
      'M4 6l0 4M4 14l0 6M10 10l0 6M2 10l4 0M8 10l4 0M14 6l0 12M16 8l-4 0M16 16l-4 0M20 4l0 4M20 12l0 8M22 8l-4 0',
    gradient: ['#4F7CF6', '#2540C8'],
    inDock: true,
  },
  {
    id: 'wallet',
    name: 'Wallet',
    iconPath:
      'M17 8V7a2 2 0 0 0 -2 -2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-1M20 12v4h-4a2 2 0 0 1 0 -4h4',
    gradient: ['#FBB24A', '#EA580C'],
    inDock: true,
  },
  {
    id: 'tunnel',
    name: 'Tunnel',
    iconPath: 'M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4',
    gradient: ['#3EC6F5', '#1597D6'],
    inDock: true,
  },
  {
    id: 'news',
    name: 'News',
    iconPath:
      'M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11M8 8l4 0M8 12l4 0M8 16l4 0',
    gradient: ['#FB7185', '#E11D48'],
    inDock: false,
  },
  {
    id: 'mail',
    name: 'Mail',
    iconPath:
      'M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10zM3 7l9 6l9 -6',
    gradient: ['#5AC8FA', '#0A7FF0'],
    inDock: false,
  },
  {
    id: 'messages',
    name: 'Messages',
    iconPath:
      'M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1',
    gradient: ['#4ADE80', '#16A34A'],
    inDock: false,
  },
  {
    id: 'market',
    name: 'Market',
    iconPath:
      'M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304zM9 11v-5a3 3 0 0 1 6 0v5',
    gradient: ['#F472B6', '#DB2777'],
    inDock: false,
  },
  {
    id: 'bank',
    name: 'Bank',
    iconPath:
      'M3 21l18 0M3 10l18 0M5 6l7 -3l7 3M4 10l0 11M20 10l0 11M8 14l0 3M12 14l0 3M16 14l0 3',
    gradient: ['#2DD4BF', '#0D9488'],
    inDock: false,
  },
  {
    id: 'cashswipe',
    name: 'Cash Swipe',
    iconPath:
      'M7 9m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2zM14 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 9v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h2',
    gradient: ['#A3E635', '#65A30D'],
    inDock: false,
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    iconPath:
      'M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z',
    gradient: ['#94A3B8', '#475569'],
    inDock: false,
  },
  {
    id: 'settings',
    name: 'Settings',
    iconPath:
      'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065zM9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    gradient: ['#9CA3AF', '#4B5563'],
    inDock: false,
  },
];

/** Apps shown in the dock, in order. */
export const DOCK_APPS: readonly AppDefinition[] = APPS.filter((a) => a.inDock);

/** Apps shown in the home grid, in order. */
export const GRID_APPS: readonly AppDefinition[] = APPS.filter((a) => !a.inDock);
