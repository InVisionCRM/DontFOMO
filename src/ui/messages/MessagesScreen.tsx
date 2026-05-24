/**
 * MessagesScreen.tsx — the Messages (real friends) app.
 * ------------------------------------------------------------------
 * iMessage-style: black background, big "Messages" title, decorative
 * search bar, the conversation list, slide-in detail.
 *
 * Built to the approved Messages mockup.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ConversationRow } from './ConversationRow';
import { MessagesDetail } from './MessagesDetail';
import { useGameStore } from '../../state/store';
import { findConversation, type Conversation } from '../../engine/messages';
import { fontWeight } from '../../theme/theme';

/**
 * Stable empty-array reference — fallback applied OUTSIDE the
 * selector so the Zustand snapshot stays a stable reference if
 * `s.messages` is missing during Fast Refresh schema bumps.
 */
const EMPTY_MESSAGES: readonly Conversation[] = [];

const SCREEN_BG = '#000000';
const SEARCH_BG = '#1C1C1E';
const SEARCH_TEXT = '#7C7C80';

export function MessagesScreen() {
  const conversations = useGameStore((s) => s.messages) ?? EMPTY_MESSAGES;
  const clockNow = useGameStore((s) => s.clock.now);
  const openConversation = useGameStore((s) => s.openConversation);

  const [openId, setOpenId] = useState<string | null>(null);

  const handleOpen = (id: string): void => {
    setOpenId(id);
    openConversation(id);
  };

  const opened = openId
    ? findConversation(conversations, openId) ?? null
    : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Messages</Text>
        <View style={styles.search} pointerEvents="none">
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M21 21l-6 -6"
              stroke={SEARCH_TEXT}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.searchText}>Search</Text>
        </View>

        {conversations.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            now={clockNow}
            onPress={handleOpen}
          />
        ))}

        {conversations.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptyText}>
              Texts from people you know will show up here.
            </Text>
          </View>
        )}
      </ScrollView>

      <MessagesDetail conversation={opened} onBack={() => setOpenId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 66,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  search: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: SEARCH_BG,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchText: {
    fontSize: 14,
    color: SEARCH_TEXT,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    color: SEARCH_TEXT,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
