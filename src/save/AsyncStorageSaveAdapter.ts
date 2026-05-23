/**
 * AsyncStorageSaveAdapter.ts — on-device save storage.
 * ------------------------------------------------------------------
 * The v1 SaveAdapter implementation. Persists the game to the device
 * with AsyncStorage, which runs inside Expo Go.
 *
 * The Migration Plan's eventual target is react-native-mmkv (faster),
 * but MMKV is a native module that needs a development build.
 * AsyncStorage carries the project through the Expo Go stages. Both
 * sit behind the same SaveAdapter interface, so swapping in an
 * MmkvSaveAdapter later touches no game code (CLAUDE.md §5).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SAVE_VERSION,
  type SaveAdapter,
  type SaveEnvelope,
} from './SaveAdapter';

/** The single AsyncStorage key the whole save lives under. */
const STORAGE_KEY = 'cryptolife.save';

export class AsyncStorageSaveAdapter implements SaveAdapter {
  async load<T = unknown>(): Promise<SaveEnvelope<T> | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as SaveEnvelope<T>;
    } catch (error) {
      // Corrupt save data — recover by treating it as no save rather
      // than crashing. A genuine I/O failure above is left to throw.
      console.warn(
        '[CryptoLife] save data was unreadable, ignoring it:',
        error,
      );
      return null;
    }
  }

  async save<T = unknown>(data: T): Promise<void> {
    const envelope: SaveEnvelope<T> = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      data,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
