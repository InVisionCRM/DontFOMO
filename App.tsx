/**
 * App.tsx — the app entry component.
 * ------------------------------------------------------------------
 * Mounts the in-game phone shell and starts the game loop. The real OS
 * status bar is hidden so the game's own simulated status bar is the
 * only one on screen.
 *
 * Stage 2 — the phone shell plus the live clock. Top-level routing
 * (onboarding vs. the running game) arrives in a later stage.
 */
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneShell } from './src/ui/PhoneShell';
import { useGameLoop } from './src/state/useGameLoop';

export default function App() {
  // Drives the game clock from real time (tick + offline catch-up).
  useGameLoop();

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <PhoneShell />
    </SafeAreaProvider>
  );
}
