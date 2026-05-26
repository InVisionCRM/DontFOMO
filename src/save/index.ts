/**
 * src/save — the persistence layer.
 * ------------------------------------------------------------------
 * Game code talks to the SaveAdapter interface, never to storage
 * directly. v1 ships the AsyncStorage adapter; a CloudSaveAdapter can
 * be added later behind the same interface, with no game-code changes.
 * See CLAUDE.md §5.
 */
import { AsyncStorageSaveAdapter } from './AsyncStorageSaveAdapter';

export type { SaveAdapter, SaveEnvelope, SaveMigration } from './SaveAdapter';
export { SAVE_VERSION } from './SaveAdapter';
export {
  SAVE_MIGRATIONS,
  isSaveLoadable,
  migrateEnvelope,
} from './migrations';
export { AsyncStorageSaveAdapter } from './AsyncStorageSaveAdapter';

/** The app-wide save adapter instance. */
export const saveAdapter = new AsyncStorageSaveAdapter();
