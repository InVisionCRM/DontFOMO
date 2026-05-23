/**
 * MessageBubble.tsx — one chat-message bubble in the detail.
 * ------------------------------------------------------------------
 * Incoming bubbles align left with a coloured sender name above the
 * text. Outgoing bubbles align right, with a lighter blue background
 * and no sender label.
 *
 * Pure presentational.
 */
import { StyleSheet, Text, View } from 'react-native';
import { senderColour, type TunnelMessage } from '../../engine/tunnel';
import { formatTime } from '../format';
import { fontWeight } from '../../theme/theme';

interface MessageBubbleProps {
  message: TunnelMessage;
  /**
   * For channels we show the sender name above the bubble; for DMs
   * the sender is implicit (the chat name), so the label is hidden.
   */
  showSender: boolean;
}

const IN_BG = '#1E2C3A';
const OUT_BG = '#2B5278';
const TEXT_COLOR = '#FFFFFF';
const TIME_IN_COLOR = '#6C7883';
const TIME_OUT_COLOR = '#8DB4D8';

export function MessageBubble({ message, showSender }: MessageBubbleProps) {
  const out = !!message.outgoing;
  return (
    <View style={[styles.row, out ? styles.rowOut : styles.rowIn]}>
      <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
        {!out && showSender && message.sender && (
          <Text
            style={[
              styles.sender,
              { color: senderColour(message.sender) },
            ]}
          >
            {message.sender}
          </Text>
        )}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={[styles.time, out && styles.timeOut]}>
          {formatTime(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowIn: {
    justifyContent: 'flex-start',
  },
  rowOut: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  bubbleIn: {
    backgroundColor: IN_BG,
    borderBottomLeftRadius: 4,
  },
  bubbleOut: {
    backgroundColor: OUT_BG,
    borderBottomRightRadius: 4,
  },
  sender: {
    fontSize: 12.5,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_COLOR,
  },
  time: {
    fontSize: 10.5,
    color: TIME_IN_COLOR,
    textAlign: 'right',
    marginTop: 2,
  },
  timeOut: {
    color: TIME_OUT_COLOR,
  },
});
