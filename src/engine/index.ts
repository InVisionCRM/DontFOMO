/**
 * src/engine — the game engine.
 * ------------------------------------------------------------------
 * Pure TypeScript game logic. The MOST IMPORTANT rule in the project:
 * NO React and NO React Native imports anywhere under this folder.
 *
 * The market simulation, the game clock, the economy, the scam
 * director and the social model all run headless here. That keeps the
 * engine fully unit-testable and lets us fast-forward it for the
 * offline simulation (the world advances while the app is closed).
 *
 * Subfolders: time/ · market/ · economy/ · scam-director/ · social/
 */
export * from './time';
export * from './market';
