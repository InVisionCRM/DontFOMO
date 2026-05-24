/**
 * MessageBubble.tsx — one iMessage-style bubble (text or link card).
 * ------------------------------------------------------------------
 * Incoming bubbles are dark gray with rounded-top corners and a
 * tucked-in bottom-left. Outgoing bubbles use iMessage blue, mirror-
 * tucked at the bottom-right. Link bubbles render a small thumbnail
 * + URL + headline card (always left-aligned per the mockup — link
 * previews come from incoming contacts in v1).
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MessageItem } from '../../engine/messages';
import { fontWeight } from '../../theme/theme';

interface MessageBubbleProps {
  message: MessageItem;
}

const IN_BG = '#26252A';
const OUT_BG = '#0A84FF';
const TEXT_COLOR = '#FFFFFF';
const LINK_CARD_BG = '#1C1C1E';
const LINK_CARD_BORDER = '#2C2C2E';
const LINK_URL_COLOR = '#8E8E93';
const DEFAULT_THUMB: readonly [string, string] = ['#3B2A6E', '#7C3AED'];

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.link) {
    return (
      <View style={styles.row}>
        <View style={styles.linkCard}>
          <LinearGradient
            colors={message.link.thumbnailGradient ?? DEFAULT_THUMB}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.linkThumb}
          />
          <View style={styles.linkMeta}>
            <Text style={styles.linkUrl}>{message.link.url}</Text>
            <Text style={styles.linkTitle}>{message.link.title}</Text>
          </View>
        </View>
      </View>
    );
  }

  const out = !!message.outgoing;
  return (
    <View style={[styles.row, out ? styles.rowOut : styles.rowIn]}>
      <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
        <Text style={styles.text}>{message.text ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  rowIn: {
    justifyContent: 'flex-start',
  },
  rowOut: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '76%',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 19,
  },
  bubbleIn: {
    backgroundColor: IN_BG,
    borderBottomLeftRadius: 6,
  },
  bubbleOut: {
    backgroundColor: OUT_BG,
    borderBottomRightRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: TEXT_COLOR,
  },
  linkCard: {
    maxWidth: '76%',
    backgroundColor: LINK_CARD_BG,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINK_CARD_BORDER,
    overflow: 'hidden',
  },
  linkThumb: {
    height: 76,
  },
  linkMeta: {
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  linkUrl: {
    fontSize: 11.5,
    color: LINK_URL_COLOR,
  },
  linkTitle: {
    fontSize: 13,
    color: TEXT_COLOR,
    marginTop: 2,
    fontWeight: fontWeight.regular,
  },
});
