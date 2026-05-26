/**
 * RugRadarCardView.tsx — render one Rug Radar card by type.
 * ------------------------------------------------------------------
 * A purely presentational component. Reads a card and a stamp
 * (the post-judgement LEGIT/SCAM watermark) and renders the right
 * surface — token launch / message / email / wallet permission.
 *
 * Card-specific palette stays inline per CLAUDE.md §13's pattern.
 * Cross-app values (foundation colours, spacing, radii) come from
 * the theme tokens.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  color,
  fontSize,
  fontWeight,
  radius,
  spacing,
  tabularNums,
} from '../../theme/theme';
import type { RugRadarCard } from '../../engine/rugRadar';
import type {
  EmailCardContent,
  MessageCardContent,
  PermCardContent,
  RugRadarCardContent,
  TokenCardContent,
} from '../../data/rugRadar';

/** Tone colours used inside cards. Inline because they only matter here. */
const TONE = {
  green: '#16C784',
  red: '#EA3943',
  amber: '#F7A83A',
} as const;

/** Per-card-type tag chip colours. */
const CHIP_BY_TYPE = {
  token: { fg: '#FB923C', border: 'rgba(251,146,60,0.30)', bg: 'rgba(251,146,60,0.10)' },
  tweet: { fg: '#1D9BF0', border: 'rgba(29,155,240,0.30)', bg: 'rgba(29,155,240,0.10)' },
  dm: { fg: '#2AABEE', border: 'rgba(42,171,238,0.30)', bg: 'rgba(42,171,238,0.10)' },
  email: { fg: '#2F8FFF', border: 'rgba(47,143,255,0.30)', bg: 'rgba(47,143,255,0.10)' },
  perm: { fg: '#F7A83A', border: 'rgba(247,168,58,0.30)', bg: 'rgba(247,168,58,0.10)' },
} as const;

interface RugRadarCardViewProps {
  card: RugRadarCard;
  /** Post-judgement watermark. null = nothing shown. */
  stamp: 'legit' | 'scam' | null;
}

export function RugRadarCardView({ card, stamp }: RugRadarCardViewProps) {
  const chip = CHIP_BY_TYPE[card.type];
  const content = card.content as RugRadarCardContent;

  return (
    <View style={styles.card}>
      <View style={[styles.chip, { borderColor: chip.border, backgroundColor: chip.bg }]}>
        <Text style={[styles.chipText, { color: chip.fg }]}>
          {card.tag.toUpperCase()}
        </Text>
      </View>

      {stamp && (
        <View
          style={[
            styles.stamp,
            {
              borderColor: stamp === 'legit' ? TONE.green : TONE.red,
            },
          ]}
        >
          <Text
            style={[
              styles.stampText,
              { color: stamp === 'legit' ? TONE.green : TONE.red },
            ]}
          >
            {stamp === 'legit' ? 'LEGIT' : 'SCAM'}
          </Text>
        </View>
      )}

      <View style={styles.body}>{renderContent(content)}</View>
    </View>
  );
}

function renderContent(content: RugRadarCardContent) {
  switch (content.kind) {
    case 'token':
      return <TokenCard content={content} />;
    case 'message':
      return <MessageCard content={content} />;
    case 'email':
      return <EmailCard content={content} />;
    case 'perm':
      return <PermCard content={content} />;
  }
}

function TokenCard({ content }: { content: TokenCardContent }) {
  return (
    <View>
      <View style={tokStyles.row}>
        <LinearGradient
          colors={[content.logoGradient[0], content.logoGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tokStyles.logo}
        >
          <Text style={tokStyles.logoText}>{content.logoText}</Text>
        </LinearGradient>
        <View>
          <Text style={tokStyles.name}>{content.name}</Text>
          <Text style={[tokStyles.ticker, tabularNums]}>${content.ticker}</Text>
        </View>
      </View>

      <View style={tokStyles.stats}>
        {content.stats.map((stat) => (
          <View key={stat.label} style={tokStyles.statRow}>
            <Text style={tokStyles.statLabel}>{stat.label}</Text>
            <Text
              style={[
                tokStyles.statValue,
                tabularNums,
                stat.tone ? { color: TONE[stat.tone] } : null,
              ]}
            >
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={tokStyles.audit}>
        <Text style={tokStyles.auditText}>{content.audit}</Text>
      </View>
    </View>
  );
}

function MessageCard({ content }: { content: MessageCardContent }) {
  return (
    <View>
      <View style={msgStyles.from}>
        <LinearGradient
          colors={[content.avatarGradient[0], content.avatarGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={msgStyles.avatar}
        >
          <Text style={msgStyles.avatarText}>{content.avatarText}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <View style={msgStyles.nameRow}>
            <Text style={msgStyles.name}>{content.displayName}</Text>
            {content.verified && (
              <View
                style={[
                  msgStyles.verified,
                  {
                    backgroundColor:
                      content.verified === 'gold' ? '#F7A83A' : '#1D9BF0',
                  },
                ]}
              >
                <Text style={msgStyles.verifiedMark}>✓</Text>
              </View>
            )}
          </View>
          <Text style={msgStyles.handle}>{content.handle}</Text>
        </View>
      </View>
      <Text style={msgStyles.body}>{content.body}</Text>
      {content.link && (
        <Text style={[msgStyles.link, tabularNums]}>{content.link}</Text>
      )}
      <Text style={msgStyles.meta}>{content.meta}</Text>
    </View>
  );
}

function EmailCard({ content }: { content: EmailCardContent }) {
  return (
    <View>
      <Text style={emailStyles.sender}>{content.sender}</Text>
      <Text style={emailStyles.addr}>{content.address}</Text>
      <Text style={emailStyles.subject}>{content.subject}</Text>
      <Text style={emailStyles.body}>{content.body}</Text>
    </View>
  );
}

function PermCard({ content }: { content: PermCardContent }) {
  return (
    <View>
      <Text style={permStyles.head}>dApp is requesting</Text>
      <Text style={permStyles.action}>{content.action}</Text>
      <View style={permStyles.rows}>
        {content.rows.map((row, i) => (
          <View
            key={row.label}
            style={[
              permStyles.row,
              i === 0 ? null : permStyles.rowBordered,
            ]}
          >
            <Text style={permStyles.rowLabel}>{row.label}</Text>
            <Text
              style={[
                permStyles.rowValue,
                tabularNums,
                row.mono ? permStyles.rowValueMono : null,
                row.tone ? { color: TONE[row.tone] } : null,
              ]}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.hairline,
    padding: spacing.lg,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
  },
  stamp: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg - 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    transform: [{ rotate: '-12deg' }],
  },
  stampText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.6,
  },
  body: {
    marginTop: spacing.md + 2,
    flex: 1,
  },
});

const tokStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    letterSpacing: -0.3,
  },
  ticker: {
    fontSize: 12,
    color: color.text.secondary,
    marginTop: 2,
  },
  stats: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.md,
  },
  statRow: {
    width: '47%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 11,
    color: color.text.secondary,
  },
  statValue: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  audit: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  auditText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#C8CAD4',
  },
});

const msgStyles = StyleSheet.create({
  from: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
    fontSize: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  verified: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedMark: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  handle: {
    fontSize: 12,
    color: color.text.secondary,
  },
  body: {
    marginTop: spacing.md + 2,
    fontSize: 14,
    lineHeight: 21,
    color: '#E6E7EC',
  },
  link: {
    marginTop: 6,
    fontSize: 13,
    color: '#FB923C',
  },
  meta: {
    marginTop: spacing.md,
    fontSize: 11,
    color: color.text.tertiary,
  },
});

const emailStyles = StyleSheet.create({
  sender: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
  },
  addr: {
    fontSize: 11.5,
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  subject: {
    marginTop: spacing.md + 2,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
  },
  body: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: '#C8CAD4',
  },
});

const permStyles = StyleSheet.create({
  head: {
    fontSize: 11,
    color: color.text.secondary,
    letterSpacing: 0.4,
  },
  action: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: color.text.primary,
    marginTop: 4,
  },
  rows: {
    marginTop: spacing.md + 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: spacing.md + 2,
  },
  rowBordered: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: {
    fontSize: 11,
    color: color.text.secondary,
  },
  rowValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    color: color.text.primary,
    textAlign: 'right',
  },
  rowValueMono: {
    fontSize: 11.5,
  },
});
