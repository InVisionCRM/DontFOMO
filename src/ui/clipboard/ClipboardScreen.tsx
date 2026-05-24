/**
 * ClipboardScreen.tsx — the Clipboard app.
 * ------------------------------------------------------------------
 * The on-device copy history (Bible §5, §11). Most entries are
 * harmless flavour — but a copied **recovery phrase** is the armed
 * Clipboard Scam (Scam Library v1.1 Event #5). Sensitive entries
 * render with a danger border and a teaching callout. Tapping the
 * delete button defuses the trap.
 *
 * Built to DontFOMO_Clipboard_App_Mockup.html. Per-app palette stays
 * inline (CLAUDE.md §13's pattern).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Pressable } from 'react-native';
import { useGameStore } from '../../state/store';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';
import type { ClipboardEntry } from '../../engine/clipboard';

const TOP_PAD = 52;

/** Stable empty-array reference to avoid the Zustand re-render trap. */
const EMPTY: readonly ClipboardEntry[] = [];

export function ClipboardScreen() {
  const insets = useSafeAreaInsets();
  const clipboard = useGameStore((s) => s.clipboard) ?? EMPTY;
  const clockNow = useGameStore((s) => s.clock.now);
  const deleteClipboardEntry = useGameStore((s) => s.deleteClipboardEntry);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.title}>Clipboard</Text>
          <Text style={styles.sub}>
            Everything you copy is saved here until you remove it.
          </Text>
        </View>

        {clipboard.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing copied yet</Text>
            <Text style={styles.emptyText}>
              Addresses, links, codes and anything else you copy from inside
              the apps will land here.
            </Text>
          </View>
        ) : (
          <View>
            {clipboard.map((entry) => (
              <ClipRow
                key={entry.id}
                entry={entry}
                now={clockNow}
                onDelete={() => deleteClipboardEntry(entry.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface ClipRowProps {
  entry: ClipboardEntry;
  now: number;
  onDelete: () => void;
}

function ClipRow({ entry, now, onDelete }: ClipRowProps) {
  const isDanger = entry.isSensitive;
  return (
    <View style={[styles.clip, isDanger ? styles.clipDanger : null]}>
      <View style={styles.clipBody}>
        <Text style={styles.clipType}>{entry.source ?? 'Text'}</Text>
        <Text style={styles.clipContent}>{entry.content}</Text>
        <Text style={styles.clipTime}>{formatCopiedAt(entry.copiedAt, now)}</Text>
        {isDanger ? (
          <View style={styles.dangerWarn}>
            <Text style={styles.dangerWarnText}>
              This is your secret recovery phrase. Anyone who reads it
              controls your entire wallet. Delete it now.
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete clipboard entry from ${entry.source ?? 'clipboard'}`}
        style={({ pressed }) => [
          styles.del,
          isDanger ? styles.delDanger : null,
          pressed && styles.delPressed,
        ]}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M18 6L6 18M6 6l12 12"
            stroke={isDanger ? '#FFFFFF' : '#8589A0'}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

/** "Copied just now / N minutes ago / N hours ago / N days ago". */
function formatCopiedAt(copiedAt: number, now: number): string {
  const diff = Math.max(0, now - copiedAt);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Copied just now';
  if (minutes < 60) return `Copied ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Copied ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `Copied ${days} day${days === 1 ? '' : 's'} ago`;
}

// Inline palette — Clipboard skin, per the mockup.
const CARD_BG = '#1A1D24';
const CARD_BORDER = '#282C38';
const TYPE_TEXT = '#8589A0';
const TIME_TEXT = '#6A6E84';
const DEL_BG = '#23262F';
const DANGER = '#EA3943';
const DANGER_TEXT = '#FFB4B8';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing.huge,
    paddingHorizontal: spacing.lg,
  },
  head: {
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
    color: color.text.primary,
  },
  sub: {
    fontSize: fontSize.label,
    color: TYPE_TEXT,
    marginTop: 3,
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: color.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.huge,
  },
  clip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius.lg - 1,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.md + 2,
    marginTop: spacing.md,
  },
  clipDanger: {
    borderColor: 'rgba(234,57,67,0.55)',
    backgroundColor: 'rgba(234,57,67,0.13)',
  },
  clipBody: { flex: 1, minWidth: 0 },
  clipType: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: TYPE_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clipContent: {
    fontSize: 14,
    color: color.text.primary,
    marginTop: 4,
    // Monospace for that "copied data" feel.
    fontVariant: ['tabular-nums'],
  },
  clipTime: {
    fontSize: 11.5,
    color: TIME_TEXT,
    marginTop: 6,
  },
  dangerWarn: {
    marginTop: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm + 2,
    backgroundColor: 'rgba(234,57,67,0.14)',
  },
  dangerWarnText: {
    fontSize: 12,
    color: DANGER_TEXT,
    lineHeight: 17.4,
  },
  del: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delDanger: {
    backgroundColor: DANGER,
  },
  delPressed: {
    opacity: 0.7,
  },
});
