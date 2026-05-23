/**
 * MailScreen.tsx — the Mail app inbox.
 * ------------------------------------------------------------------
 * Top-level layout: "Inbox" title + unread count, a decorative
 * search bar, the list of MailRows. Tapping a row opens MailDetail
 * (slides in from the right). Opening a message also marks it read
 * via the store, which bumps the inbox header + the app-icon badge.
 *
 * Built to the approved Mail mockup.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MailRow } from './MailRow';
import { MailDetail } from './MailDetail';
import { useGameStore } from '../../state/store';
import { findMessage, unreadCount } from '../../engine/mail';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

const TOP_PAD = 52;

export function MailScreen() {
  const insets = useSafeAreaInsets();
  // `?? []` guards against a stale hot-reload store where this field
  // hasn't been seeded yet — fixes the "cannot convert undefined to
  // object" crash on Fast Refresh right after the schema bump.
  const mail = useGameStore((s) => s.mail ?? []);
  const clockNow = useGameStore((s) => s.clock.now);
  const openMailMessage = useGameStore((s) => s.openMailMessage);

  const [openId, setOpenId] = useState<string | null>(null);

  const handleOpen = (id: string): void => {
    setOpenId(id);
    openMailMessage(id); // flips unread → read in the store
  };

  const unread = unreadCount(mail);
  const opened = openId ? findMessage(mail, openId) ?? null : null;

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
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.sub}>
            {unread === 0 ? 'All caught up' : `${unread} unread`}
          </Text>
        </View>

        {/* Decorative search bar — wiring search is a later concern. */}
        <View style={styles.search} pointerEvents="none">
          <Text style={styles.searchText}>Search</Text>
        </View>

        <View>
          {mail.map((m) => (
            <MailRow
              key={m.id}
              message={m}
              now={clockNow}
              onPress={handleOpen}
            />
          ))}
          {mail.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No mail</Text>
              <Text style={styles.emptyText}>
                Bills, statements and the occasional “opportunity” will land here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <MailDetail message={opened} onBack={() => setOpenId(null)} />
    </View>
  );
}

const SEARCH_BG = '#1B1D24';
const SEARCH_BORDER = '#2A2D38';
const SEARCH_TEXT = '#6B7080';
const HEAD_SUB = '#8B90A0';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.huge,
  },
  head: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
    color: color.text.primary,
  },
  sub: {
    fontSize: fontSize.label,
    color: HEAD_SUB,
    marginTop: 2,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: SEARCH_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEARCH_BORDER,
    borderRadius: radius.md - 1,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  searchText: {
    fontSize: fontSize.body,
    color: SEARCH_TEXT,
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
});
