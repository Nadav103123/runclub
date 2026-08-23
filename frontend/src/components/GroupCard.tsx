import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts, font, CATEGORY_COLORS } from "@/src/theme";
import { resolveImage } from "@/src/api";
import { Group } from "@/src/types";
import { Badge } from "@/src/components/ui";
import { relativeDay } from "@/src/utils/format";

export default function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const img = resolveImage(group.image_url);
  return (
    <Pressable
      testID={`group-card-${group.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.imageWrap}>
        {img ? (
          <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceTertiary }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(16,17,21,0.4)", colors.surface]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topRow}>
          <Badge label={group.category} color={CATEGORY_COLORS[group.category] || colors.brand} textColor="#101115" />
          {group.is_private && (
            <View style={styles.lockPill}>
              <Ionicons name="lock-closed" size={12} color={colors.onSurface} />
            </View>
          )}
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2}>{group.name}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.onSurfaceTertiary} />
          <Text style={styles.meta}>{group.city}</Text>
          <View style={styles.dot} />
          <Ionicons name="people-outline" size={14} color={colors.onSurfaceTertiary} />
          <Text style={styles.meta}>{group.member_count} members</Text>
        </View>
        {group.next_session ? (
          <View style={styles.nextRow}>
            <Ionicons name="calendar" size={14} color={colors.brand} />
            <Text style={styles.nextText} numberOfLines={1}>
              Next: {group.next_session.title} · {relativeDay(group.next_session.workout_date)}
            </Text>
          </View>
        ) : (
          <View style={styles.nextRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.onSurfaceTertiary} />
            <Text style={styles.nextMuted}>No upcoming sessions</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: { height: 150, justifyContent: "space-between" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: spacing.md },
  lockPill: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  titleWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 26, lineHeight: 28 },
  body: { padding: spacing.md, gap: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary, marginHorizontal: spacing.xs },
  nextRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  nextText: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: font.sm, flex: 1 },
  nextMuted: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
});
