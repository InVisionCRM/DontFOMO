/**
 * CloutTabPlaceholder.tsx — quiet stub for the not-yet-built Clout
 * sub-tabs (Search, Notifications, Profile). The Home tab carries
 * all v1 gameplay; the other three exist to make the bottom tab bar
 * feel real and discoverable. Each will be replaced by its own
 * backlog item — Notifications is up next.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fontWeight } from '../../theme/theme';

interface CloutTabPlaceholderProps {
  title: string;
  copy: string;
}

const MUTED = '#71767B';
const TITLE = '#E7E9EA';

export function CloutTabPlaceholder({ title, copy }: CloutTabPlaceholderProps) {
  return (
    <View style={styles.root} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 78,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: TITLE,
  },
  copy: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
});
