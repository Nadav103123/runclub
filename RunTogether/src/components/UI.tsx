import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, LEVEL_COLORS } from '../constants';

// ── Verified Badge ────────────────────────────────────────────────────────────
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <View
      style={[
        styles.verifiedBadge,
        { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 },
      ]}
    >
      <Text style={{ fontSize: size * 0.7, color: '#fff', fontWeight: '900' }}>✓</Text>
    </View>
  );
}

// ── Level Badge ───────────────────────────────────────────────────────────────
export function LevelBadge({ level }: { level: string }) {
  const color = LEVEL_COLORS[level] || COLORS.text.secondary;
  return (
    <View
      style={[
        styles.levelBadge,
        { backgroundColor: color + '22', borderColor: color + '55' },
      ]}
    >
      <Text style={[styles.levelBadgeText, { color }]}>{level}</Text>
    </View>
  );
}

// ── City Filter Chips ─────────────────────────────────────────────────────────
interface CityFilterProps {
  cities: string[];
  selected: string;
  onChange: (city: string) => void;
  accent?: string;
}

export function CityFilter({ cities, selected, onChange, accent = COLORS.yellow }: CityFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={{ marginBottom: 14 }}
    >
      {cities.map((c) => {
        const active = selected === c;
        return (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? accent + '18' : COLORS.surface,
                borderColor: active ? accent : 'rgba(255,255,255,0.1)',
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? accent : COLORS.text.muted }]}>
              {c}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Section Title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAction}>
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  verifiedBadge: {
    backgroundColor: '#1D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 9,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginBottom: 9,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.text.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: COLORS.yellow,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  emptyBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 11,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.text.muted,
    marginTop: 2,
  },
});
