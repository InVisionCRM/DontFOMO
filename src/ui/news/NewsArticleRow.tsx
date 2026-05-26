/**
 * NewsArticleRow.tsx — one headline in the News feed.
 */
import { StyleSheet, Text, View } from 'react-native';
import {
  categoryLabel,
  type NewsCategory,
  type NewsHeadline,
} from '../../engine/news';
import { formatRelativeTime } from '../format';
import { fontWeight } from '../../theme/theme';

interface NewsArticleRowProps {
  headline: NewsHeadline;
  now: number;
}

const OUTLET = '#FB7185';
const TITLE = '#FFFFFF';
const SUMMARY = 'rgba(255,255,255,0.55)';
const TIME = 'rgba(255,255,255,0.4)';
const CHIP_BG: Record<NewsCategory, string> = {
  breaking: 'rgba(225,29,72,0.22)',
  markets: 'rgba(59,130,246,0.18)',
  defi: 'rgba(45,212,191,0.18)',
  culture: 'rgba(244,114,182,0.18)',
};
const CHIP_TEXT: Record<NewsCategory, string> = {
  breaking: '#FDA4AF',
  markets: '#93C5FD',
  defi: '#5EEAD4',
  culture: '#F9A8D4',
};

export function NewsArticleRow({ headline, now }: NewsArticleRowProps) {
  const chip = categoryLabel(headline.category);
  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.outlet} numberOfLines={1}>
          {headline.outlet}
          {headline.verified ? ' ✓' : ''}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(headline.publishedAt, now)}</Text>
      </View>
      <Text style={styles.title}>{headline.title}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {headline.summary}
      </Text>
      <View
        style={[
          styles.chip,
          { backgroundColor: CHIP_BG[headline.category] },
        ]}
      >
        <Text style={[styles.chipText, { color: CHIP_TEXT[headline.category] }]}>
          {chip}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  outlet: {
    flex: 1,
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: OUTLET,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 12,
    color: TIME,
  },
  title: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: TITLE,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  summary: {
    fontSize: 14,
    color: SUMMARY,
    lineHeight: 20,
    marginTop: 6,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
