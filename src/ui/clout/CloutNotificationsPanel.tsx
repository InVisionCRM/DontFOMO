/**
 * CloutNotificationsPanel.tsx — read-only v1 Notifications tab.
 * ------------------------------------------------------------------
 * Renders the static seed from `src/data/cloutNotifications.ts`,
 * matching the bell-tab layout in `DontFOMO_X_App_Mockup.html`
 * (lines 150–157, 273–275, 433–446). FlatList virtualised per
 * CLAUDE.md §7. Pure presentational — no engine wiring yet.
 *
 * The per-screen palette (Clout black, hairline `#16181C`) stays
 * inline because Clout uses the X-style dark surface, not the
 * shared `theme.ts` dark surfaces — same convention as `CloutScreen`
 * and `CloutTabBar`.
 */
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  CLOUT_NOTIFICATIONS_SEED,
  type CloutNotification,
  type CloutNotifKind,
} from '../../data/cloutNotifications';
import { fontWeight } from '../../theme/theme';

const HEADER_TITLE = '#E7E9EA';
const ROW_BORDER = '#16181C';
const TEXT_COLOR = '#E7E9EA';
const MUTED_COLOR = '#71767B';
const MENTION_BG = '#1D9BF0';
const MENTION_FG = '#FFFFFF';

const ICON_PATHS: Record<Exclude<CloutNotifKind, 'mention'>, string> = {
  follow:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 11h-6 M19 8v6',
  like:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  repost:
    'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
  streak:
    'M12 2s4 5 4 9a4 4 0 1 1-8 0c0-1.5 1-3 1-3 M12 22a6 6 0 0 0 6-6c0-2-1-3-1-3 M6 16a6 6 0 0 0 6 6',
};

interface IconProps {
  kind: CloutNotifKind;
  color: string;
}

function NotifIcon({ kind, color }: IconProps) {
  if (kind === 'mention') {
    return (
      <View style={styles.mentionBadge}>
        <Text style={styles.mentionAt}>@</Text>
      </View>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d={ICON_PATHS[kind]}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const KIND_LABEL: Record<CloutNotifKind, string> = {
  follow: 'New follow',
  like: 'New like',
  repost: 'New repost',
  mention: 'New mention',
  streak: 'Streak reminder',
};

function notifA11yLabel(n: CloutNotification): string {
  const body = `${n.before}${n.bold}${n.after}${n.muted ? ` ${n.muted}` : ''}`;
  return `${KIND_LABEL[n.kind]}: ${body}`;
}

function NotifRow({ item }: { item: CloutNotification }) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={notifA11yLabel(item)}
    >
      <View style={styles.iconSlot}>
        <NotifIcon kind={item.kind} color={item.iconColor} />
      </View>
      <Text style={styles.body}>
        {item.before}
        <Text style={styles.bold}>{item.bold}</Text>
        {item.after}
        {item.muted ? <Text style={styles.muted}>{` ${item.muted}`}</Text> : null}
      </Text>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text style={styles.headerTitle}>Notifications</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Live notifications arrive in a later pass. This list is a preview.
      </Text>
    </View>
  );
}

export function CloutNotificationsPanel() {
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={CLOUT_NOTIFICATIONS_SEED}
      keyExtractor={(n) => n.id}
      renderItem={NotifRow}
      ListHeaderComponent={Header}
      ListFooterComponent={Footer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 24,
    paddingBottom: 110,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: fontWeight.bold,
    color: HEADER_TITLE,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_BORDER,
  },
  iconSlot: {
    width: 30,
    paddingTop: 2,
    alignItems: 'center',
  },
  mentionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MENTION_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAt: {
    color: MENTION_FG,
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  body: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: TEXT_COLOR,
  },
  bold: {
    fontWeight: fontWeight.bold,
    color: TEXT_COLOR,
  },
  muted: {
    color: MUTED_COLOR,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  footerText: {
    fontSize: 12.5,
    color: MUTED_COLOR,
    textAlign: 'center',
    lineHeight: 18,
  },
});
