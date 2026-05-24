/**
 * App.tsx — the app entry component.
 * ------------------------------------------------------------------
 * Mounts the live game loop and switches between the two top-level
 * shells based on whether the player has finished onboarding (Bible
 * §13). The OS status bar is hidden so the game's own simulated
 * status bar is the only one on screen.
 *
 * Top-level routing is state-driven, not Expo Router — CLAUDE.md §5
 * keeps in-game app switching in the store; the same principle covers
 * the onboarding/game switch here. We can introduce Expo Router later
 * if a second top-level flow appears.
 */
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneShell } from './src/ui/PhoneShell';
import { OnboardingShell } from './src/ui/onboarding';
import { useGameLoop } from './src/state/useGameLoop';
import { useGameStore } from './src/state/store';

export default function App() {
  // Drives the game clock from real time (tick + offline catch-up).
  useGameLoop();

  // Subscribe to just the flag so render updates flow when onboarding
  // completes via `finishOnboarding`.
  const hasOnboarded = useGameStore((s) => s.onboarding.hasOnboarded);

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      {hasOnboarded ? <PhoneShell /> : <OnboardingShell />}
    </SafeAreaProvider>
  );
}
