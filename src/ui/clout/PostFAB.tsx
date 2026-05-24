/**
 * PostFAB.tsx — the floating "Post today" button.
 * ------------------------------------------------------------------
 * Big blue circle bottom-right. When the player can post today,
 * it's enabled and shows a flame + streak-day badge in the top-
 * right corner. When the player has already posted, it dims and
 * the badge shows a ✓ instead.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fontWeight, tabularNums } from '../../theme/theme';

interface PostFABProps {
  canPost: boolean;
  streakDays: number;
  onPress: () => void;
}

const BLUE = '#1D9BF0';
const FLAME = '#FB923C';
const BADGE_TEXT = '#1A1205';
const BADGE_BORDER = '#000000';
const DISABLED_OPACITY = 0.45;

const PENCIL_PATH =
  'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4M13.5 6.5l4 4';
const FLAME_PATH =
  'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z';
const CHECK_PATH = 'M5 12l5 5l10 -10';

export function PostFAB({ canPost, streakDays, onPress }: PostFABProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        !canPost && { opacity: DISABLED_OPACITY },
        pressed && canPost && styles.fabPressed,
      ]}
      onPress={canPost ? onPress : undefined}
      disabled={!canPost}
      accessibilityRole="button"
      accessibilityLabel={
        canPost
          ? streakDays === 0
            ? 'Post today and start your streak'
            : `Post today, day ${streakDays + 1}`
          : 'Already posted today'
      }
    >
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d={PENCIL_PATH}
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {streakDays > 0 && (
        <View style={styles.badge}>
          {canPost ? (
            <>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                <Path
                  d={FLAME_PATH}
                  stroke={BADGE_TEXT}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.badgeText, tabularNums]}>{streakDays}</Text>
            </>
          ) : (
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d={CHECK_PATH}
                stroke={BADGE_TEXT}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: FLAME,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: BADGE_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 22,
    minHeight: 18,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: BADGE_TEXT,
  },
});
