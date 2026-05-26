/**
 * TunnelScreen.tsx — the Tunnel chat app.
 * ------------------------------------------------------------------
 * Telegram-style chat list inside the in-game phone: navy header
 * with "Tunnel" title + a decorative search bar, the flat list of
 * chats (channels and DMs mixed), the slide-in detail.
 *
 * Built to the approved Tunnel mockup.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TunnelChatRow } from './TunnelChatRow';
import { TunnelChatDetail } from './TunnelChatDetail';
import { useGameStore } from '../../state/store';
import {
  findTunnelChat,
  totalUnreadCount,
  type TunnelChat,
} from '../../engine/tunnel';
import { fontWeight } from '../../theme/theme';

/**
 * Stable empty-array reference for the stale-state fallback. The
 * `?? EMPTY` happens OUTSIDE the selector so Zustand sees the same
 * reference each call — same lesson as Mail.
 */
const EMPTY_TUNNEL: readonly TunnelChat[] = [];

const SCREEN_BG = '#17212B';
const HEADER_BG = '#212D3B';
const SEARCH_BG = '#17212B';
const SEARCH_TEXT = '#6C7883';

export function TunnelScreen() {
  const chats = useGameStore((s) => s.tunnel) ?? EMPTY_TUNNEL;
  const clockNow = useGameStore((s) => s.clock.now);
  const openTunnelChat = useGameStore((s) => s.openTunnelChat);

  const [openId, setOpenId] = useState<string | null>(null);

  const handleOpen = (id: string): void => {
    setOpenId(id);
    openTunnelChat(id); // zeros unread in the store
  };

  const opened = openId ? findTunnelChat(chats, openId) ?? null : null;
  const unread = totalUnreadCount(chats);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Tunnel</Text>
          {unread > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.search} pointerEvents="none">
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Path
              d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M21 21l-6 -6"
              stroke={SEARCH_TEXT}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.searchText}>Search</Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {chats.map((c) => (
          <TunnelChatRow key={c.id} chat={c} now={clockNow} onPress={handleOpen} />
        ))}
        {chats.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyText}>
              Communities and DMs will land here as you find them.
            </Text>
          </View>
        )}
      </ScrollView>

      <TunnelChatDetail chat={opened} onBack={() => setOpenId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    backgroundColor: HEADER_BG,
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  title: {
    fontSize: 21,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: '#5EB5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: '#17212B',
  },
  search: {
    backgroundColor: SEARCH_BG,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchText: {
    fontSize: 14,
    color: SEARCH_TEXT,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
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
