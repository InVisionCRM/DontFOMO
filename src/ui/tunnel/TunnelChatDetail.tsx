/**
 * TunnelChatDetail.tsx — the slide-in chat detail view.
 * ------------------------------------------------------------------
 * Header with back button + avatar + name + subtitle, optional
 * pinned-message bar, the scrolling message list (bubbles), and a
 * decorative composer pinned to the bottom. Mirrors the Mail /
 * Exchange slide-in pattern.
 *
 * Composer is decorative in v1 — sending requires a Stage 6 wiring
 * once the Scam Director knows how to respond.
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { MessageBubble } from './MessageBubble';
import {
  chatInitials,
  type TunnelChat,
} from '../../engine/tunnel';
import { fontWeight, motion } from '../../theme/theme';

interface TunnelChatDetailProps {
  chat: TunnelChat | null;
  onBack: () => void;
}

const SCREEN_BG = '#0E1621';
const HEADER_BG = '#212D3B';
const COMPOSER_BG = '#17212B';
const SUB_COLOR = '#6C7883';
const PIN_KEY_COLOR = '#5EB5F7';
const PIN_VALUE_COLOR = '#CBD5E0';

function formatMemberCount(n: number): string {
  return n.toLocaleString('en-US');
}

function subtitleFor(chat: TunnelChat): string {
  if (chat.kind === 'channel' && chat.memberCount) {
    const members = `${formatMemberCount(chat.memberCount)} members`;
    if (chat.onlineCount) {
      return `${members}, ${formatMemberCount(chat.onlineCount)} online`;
    }
    return members;
  }
  return 'last seen recently';
}

export function TunnelChatDetail({ chat, onBack }: TunnelChatDetailProps) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const msgsRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: chat ? 1 : 0,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing),
      useNativeDriver: true,
    }).start();
    if (chat) {
      // Defer to next frame so the layout is ready before scrolling.
      requestAnimationFrame(() => {
        msgsRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [chat, progress]);

  if (!chat) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });
  const isChannel = chat.kind === 'channel';

  return (
    <Animated.View style={[styles.root, { transform: [{ translateX }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tunnel"
          hitSlop={8}
        >
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6l-6 6l6 6"
              stroke={PIN_KEY_COLOR}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <LinearGradient
          colors={chat.avatarGradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {chat.initials ?? chatInitials(chat.name)}
          </Text>
        </LinearGradient>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitleFor(chat)}
          </Text>
        </View>
      </View>

      {/* Pinned bar */}
      {chat.pinned && (
        <View style={styles.pinned}>
          <View style={styles.pinIcon}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 4v6l-2 4v2h10v-2l-2 -4v-6M12 16v5M9 4h6"
                stroke={PIN_KEY_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View style={styles.pinText}>
            <Text style={styles.pinKey}>Pinned message</Text>
            <Text style={styles.pinValue} numberOfLines={2}>
              {chat.pinned}
            </Text>
          </View>
        </View>
      )}

      {/* Message scroll */}
      <ScrollView
        ref={msgsRef}
        style={styles.msgsScroll}
        contentContainerStyle={styles.msgsContent}
        showsVerticalScrollIndicator={false}
      >
        {chat.messages.map((m) => (
          <MessageBubble key={m.id} message={m} showSender={isChannel} />
        ))}
      </ScrollView>

      {/* Composer (decorative) */}
      <View style={styles.composer}>
        <View style={styles.composerBox}>
          <Text style={styles.composerPlaceholder}>Message</Text>
        </View>
        <View style={styles.sendBtn}>
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path
              d="M10 14l11 -11M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1z"
              stroke="#17212B"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCREEN_BG,
    flexDirection: 'column',
  },
  header: {
    backgroundColor: HEADER_BG,
    paddingTop: 64,
    paddingBottom: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12.5,
    color: SUB_COLOR,
    marginTop: 1,
  },
  pinned: {
    backgroundColor: HEADER_BG,
    borderLeftWidth: 3,
    borderLeftColor: PIN_KEY_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pinIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    flex: 1,
  },
  pinKey: {
    fontSize: 11.5,
    fontWeight: fontWeight.semibold,
    color: PIN_KEY_COLOR,
  },
  pinValue: {
    fontSize: 13,
    color: PIN_VALUE_COLOR,
    marginTop: 1,
  },
  msgsScroll: {
    flex: 1,
  },
  msgsContent: {
    padding: 12,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  composer: {
    backgroundColor: COMPOSER_BG,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerBox: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  composerPlaceholder: {
    fontSize: 14,
    color: SUB_COLOR,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: PIN_KEY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
