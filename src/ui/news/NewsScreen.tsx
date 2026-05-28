/**
 * NewsScreen.tsx — the News app (v1).
 * ------------------------------------------------------------------
 * Headline feed from `src/data/news.ts`. Market price nudges from
 * news can wire into the engine in a later pass.
 */
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABEL,
  createStartingNews,
  filterHeadlines,
  formatRelativeTimestamp,
  type NewsCategory,
  type NewsHeadline,
} from '../../data/news';
import { useGameStore } from '../../state/store';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../../theme/theme';

const TOP_PAD = 52;
const NEWS_ACCENT = '#FB7185';

/** Per-category chip tint — keeps each topic visually distinct. */
const CATEGORY_ACCENT: Readonly<Record<NewsCategory, string>> = {
  market: '#FB7185',
  regulation: '#60A5FA',
  defi: '#22C55E',
  tech: '#A78BFA',
  culture: '#F59E0B',
};

export function NewsScreen() {
  const insets = useSafeAreaInsets();
  const clockNow = useGameStore((s) => s.clock.now);
  const [selected, setSelected] = useState<NewsCategory | null>(null);

  const headlines = useMemo(() => createStartingNews(clockNow), [clockNow]);
  const filtered = useMemo(
    () => filterHeadlines(headlines, selected),
    [headlines, selected],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: Math.max(insets.top, TOP_PAD) },
        ]}
        ListHeaderComponent={
          <ListHeader selected={selected} onSelect={setSelected} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No stories in this section.</Text>
            <Text style={styles.emptySub}>
              Try another category — the feed refreshes as the world moves.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HeadlineCard headline={item} now={clockNow} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

interface ListHeaderProps {
  selected: NewsCategory | null;
  onSelect: (category: NewsCategory | null) => void;
}

function ListHeader({ selected, onSelect }: ListHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>News</Text>
      <Text style={styles.sub}>Headlines that move the market — eventually</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        accessibilityRole="tablist"
      >
        <Chip
          label="All"
          selected={selected === null}
          onPress={() => onSelect(null)}
        />
        {NEWS_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={NEWS_CATEGORY_LABEL[category]}
            tint={CATEGORY_ACCENT[category]}
            selected={selected === category}
            onPress={() => onSelect(category)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  tint?: string;
}

function Chip({ label, selected, onPress, tint }: ChipProps) {
  const accent = tint ?? color.brand;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`Show ${label} headlines`}
      hitSlop={8}
      style={[
        styles.chip,
        selected && {
          backgroundColor: `${accent}22`,
          borderColor: accent,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selected && { color: accent, fontWeight: fontWeight.bold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface HeadlineCardProps {
  headline: NewsHeadline;
  now: number;
}

function HeadlineCard({ headline, now }: HeadlineCardProps) {
  const accent = CATEGORY_ACCENT[headline.category];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.outlet, { color: NEWS_ACCENT }]}>
          {headline.outlet}
        </Text>
        <View style={[styles.categoryPill, { borderColor: accent }]}>
          <Text style={[styles.categoryPillText, { color: accent }]}>
            {NEWS_CATEGORY_LABEL[headline.category]}
          </Text>
        </View>
      </View>
      <Text style={styles.headline}>{headline.title}</Text>
      <Text style={styles.summary}>{headline.summary}</Text>
      <Text style={styles.when}>
        {formatRelativeTimestamp(headline.publishedAt, now)}
      </Text>
      {headline.tags && headline.tags.length > 0 && (
        <Text style={styles.tags}>{headline.tags.join(' · ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  sub: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: color.text.secondary,
  },
  chipsRow: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
    backgroundColor: color.bg.surface,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: fontSize.label,
    color: color.text.secondary,
    fontWeight: fontWeight.semibold,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.hairline,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outlet: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryPillText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
  },
  headline: {
    marginTop: spacing.sm,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    lineHeight: 22,
  },
  summary: {
    marginTop: spacing.sm,
    fontSize: fontSize.body,
    color: color.text.secondary,
    lineHeight: 21,
  },
  when: {
    marginTop: spacing.md,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
  },
  tags: {
    marginTop: spacing.xs,
    fontSize: fontSize.caption,
    color: color.text.tertiary,
  },
  empty: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  emptySub: {
    marginTop: spacing.sm,
    fontSize: fontSize.label,
    color: color.text.secondary,
    textAlign: 'center',
  },
});
