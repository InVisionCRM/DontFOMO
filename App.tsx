/**
 * App.tsx — the app entry component.
 * ------------------------------------------------------------------
 * Mounts the in-game phone shell. The real OS status bar is hidden so
 * the game's own simulated status bar is the only one on screen.
 *
 * Checkpoint 1 of Stage 2 — the static phone shell. Top-level routing
 * (onboarding vs. the running game) arrives in a later stage.
 */
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneShell } from './src/ui/PhoneShell';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <PhoneShell />
    </SafeAreaProvider>
  );
}
