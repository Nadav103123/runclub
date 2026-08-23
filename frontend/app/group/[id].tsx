import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius, CATEGORY_COLORS } from "@/src/theme";
import { Button, Badge, StateView } from "@/src/components/ui";
import { api, resolveImage } from "@/src/api";
import { Group, Session } from "@/src/types";
import { relativeDay, fmtTime } from "@/src/utils/format";

export default function GroupDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [g, ws] = await Promise.all([
        api.get<Group>(`/groups/${id}`),
        api.get<Session[]>(`/groups/${id}/workouts`),
      ]);
      setGroup(g);
      setSessions(ws.filter((w) => new Date(w.workout_date) >= new Date(Date.now() - 3600_000)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMembership = async () => {
    if (!group) return;
    setActing(true);
    try {
      if (group.my_status === "approved") {
        await api.post(`/groups/${id}/leave`);
      } else {
        await api.post(`/groups/${id}/join`);
      }
      await load();
    } catch {}
    finally {
      setActing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }
  if (error || !group) {
    return (
      <View style={styles.center}>
        <StateView icon="alert-circle-outline" title="Failed to load group" actionLabel="Retry" onAction={load} />
      </View>
    );
  }

  const isAdmin = group.my_status === "admin";
  const isMember = group.my_status === "approved";
  const isPending = group.my_status === "pending";

  let ctaLabel = group.is_private ? "Request to Join" : "Join Group";
  let ctaVariant: "primary" | "secondary" | "outline" | "success" = "primary";
  let ctaDisabled = false;
  if (isMember) { ctaLabel = "Leave Group"; ctaVariant = "outline"; }
  if (isPending) { ctaLabel = "Request Pending"; ctaVariant = "secondary"; ctaDisabled = true; }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {resolveImage(group.image_url) ? (
            <Image source={{ uri: resolveImage(group.image_url) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceTertiary }]} />
          )}
          <LinearGradient colors={["rgba(16,17,21,0.5)", "transparent", colors.surface]} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + spacing.sm }]} testID="group-back">
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              <Badge label={group.category} color={CATEGORY_COLORS[group.category] || colors.brand} textColor="#101115" />
              {group.is_private && <Badge label="Private" color={colors.surfaceTertiary} textColor={colors.onSurface} />}
            </View>
            <Text style={styles.heroTitle}>{group.name}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="location" size={14} color={colors.onSurfaceSecondary} />
              <Text style={styles.heroMetaText}>{group.city}</Text>
              <View style={styles.metaDot} />
              <Ionicons name="person" size={14} color={colors.onSurfaceSecondary} />
              <Text style={styles.heroMetaText}>Led by {group.admin_name}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{group.member_count}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{group.category}</Text>
            <Text style={styles.statLabel}>Category</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{group.is_private ? "Private" : "Public"}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>

        {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}

        {group.meeting_days?.length ? (
          <View style={styles.daysRow}>
            {group.meeting_days.map((d) => (
              <View key={d} style={styles.dayPill}><Text style={styles.dayPillText}>{d}</Text></View>
            ))}
          </View>
        ) : null}

        {isAdmin && (
          <View style={styles.adminActions}>
            <View style={{ flex: 1 }}>
              <Button title="New Session" icon="add" onPress={() => router.push(`/workout/create?groupId=${id}`)} testID="new-session-button" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Members" variant="secondary" icon="people" onPress={() => router.push(`/group/members/${id}`)} testID="manage-members-button" />
            </View>
          </View>
        )}

        {/* Sessions */}
        <View style={styles.sessionsHead}>
          <Text style={styles.sectionTitle}>UPCOMING SESSIONS</Text>
        </View>
        {sessions.length === 0 ? (
          <StateView icon="calendar-outline" title="No sessions upcoming" subtitle={isAdmin ? "Create the first session for your group." : "Check back soon for scheduled runs."} />
        ) : (
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
            {sessions.map((s) => {
              const locked = !isMember && !isAdmin;
              return (
                <Pressable
                  key={s.id}
                  testID={`session-${s.id}`}
                  onPress={() => {
                    if (locked) return;
                    router.push(`/workout/${s.id}`);
                  }}
                  style={({ pressed }) => [styles.sessionCard, pressed && !locked && { opacity: 0.9 }]}
                >
                  <View style={styles.dateChip}>
                    <Text style={styles.dateChipDay}>{relativeDay(s.workout_date)}</Text>
                    <Text style={styles.dateChipTime}>{fmtTime(s.workout_date)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Ionicons name="location-outline" size={13} color={colors.onSurfaceTertiary} />
                      <Text style={styles.sMeta} numberOfLines={1}>{s.meeting_point_name}</Text>
                    </View>
                    <View style={styles.sessionMeta}>
                      {s.distance_km ? <Text style={styles.sMeta}>{s.distance_km} km</Text> : null}
                      {s.target_pace ? <><View style={styles.metaDot} /><Text style={styles.sMeta}>{s.target_pace}</Text></> : null}
                      <View style={styles.metaDot} />
                      <Text style={styles.sMeta}>{s.going_count} going</Text>
                    </View>
                  </View>
                  {locked ? <Ionicons name="lock-closed" size={16} color={colors.onSurfaceTertiary} /> : <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      {!isAdmin && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            title={ctaLabel}
            variant={ctaVariant}
            disabled={ctaDisabled}
            loading={acting}
            onPress={handleMembership}
            testID="membership-button"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  hero: { height: 300, justifyContent: "flex-end" },
  backBtn: { position: "absolute", left: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  heroContent: { padding: spacing.lg, gap: spacing.xs },
  heroBadges: { flexDirection: "row", gap: spacing.sm },
  heroTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 44, lineHeight: 46 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  heroMetaText: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: font.base },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary, marginHorizontal: 2 },
  stats: { flexDirection: "row", marginHorizontal: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md },
  statBox: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 22 },
  statLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, textTransform: "uppercase" },
  statDivider: { width: 1, backgroundColor: colors.border },
  desc: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.lg, lineHeight: 24, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  dayPill: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  dayPillText: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.sm },
  adminActions: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sessionsHead: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, letterSpacing: 0.5 },
  sessionCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  dateChip: { width: 70, alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, paddingVertical: spacing.sm, gap: 2 },
  dateChipDay: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.sm },
  dateChipTime: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.lg },
  sessionTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  sMeta: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, flexShrink: 1 },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
