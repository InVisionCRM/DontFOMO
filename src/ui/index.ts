/**
 * src/ui — reusable presentational components.
 * ------------------------------------------------------------------
 * React Native components. Their jobs are to render what the store
 * says and to send user input back. NO business logic, NO math, NO
 * timers in components. See CLAUDE.md §5 and §7.
 */
export { PhoneShell } from './PhoneShell';
export { Wallpaper } from './Wallpaper';
export { PhoneStatusBar } from './PhoneStatusBar';
export { HomeScreen } from './HomeScreen';
export { HomeWidgets } from './HomeWidgets';
export { Dock, DOCK_HEIGHT } from './Dock';
export { AppIcon } from './AppIcon';
export type { IconRect } from './AppIcon';
export { AppView } from './AppView';
export { GlassSurface } from './GlassSurface';
