/**
 * appScreens.ts — the registry of built in-game app screens.
 * ------------------------------------------------------------------
 * Maps an app id to its real screen component. Any app not listed here
 * falls back to the generic "built in a later stage" placeholder in
 * AppView. Screens are added to this map as each stage builds them.
 */
import type { ComponentType } from 'react';
import type { AppId } from '../data/apps';
import { ExchangeScreen } from './exchange/ExchangeScreen';

export const APP_SCREENS: Partial<Record<AppId, ComponentType>> = {
  exchange: ExchangeScreen,
};
