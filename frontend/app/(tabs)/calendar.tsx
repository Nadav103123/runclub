import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { StateView } from "@/src/components/ui";
import { api } from "@/src/api";
import { Session } from "@/src/types";
import { fmtTime, dayKey } from "@/src/utils/format";

export default function Calendar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(dayjs().format("YYYY-MM-DD"));

  // Build a 14-day strip starting today.
  const days = Array.from({ length: 14 }, (_, i) => dayjs().add(i, "day"));

  const load = useCallback(async () => {
    try {
      const data = await api.get<Session[]>("/my/calendar");
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const daySessions = sessions.filter((s) => dayKey(s.workout_date) === selected);
  const sessionDays = new Set(sessions.map((s) => dayKey(s.workout_date)));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>CALENDAR</Text>
        <Text style={styles.subtitle}>Your committed runs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {days.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const active = key === selected;
            const hasSession = sessionDays.has(key);
            return (
              <Pressable
                key={key}
                testID={`day-${key}`}
                onPress={() => setSelected(key)}
                style={[styles.dayCell, active ? styles.dayActive : styles.dayIdle]}
              >
                <Text style={[styles.dayName, active && styles.dayTextActive]}>{d.format("ddd")}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>{d.format("D")}</Text>
                {hasSession && <View style={[styles.dotMarker, active && { backgroundColor: colors.onBrandPrimary }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={daySessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`calendar-session-${item.id}`}
              onPress={() => router.push(`/workout/${item.id}`)}
              style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.timeCol}>
                <Text style={styles.time}>{fmtTime(item.workout_date)}</Text>
                <View style={styles.timeLine} />
              </View>
              <View style={styles.sessionBody}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sessionGroup} numberOfLines={1}>{item.group_name}</Text>
                <View style={styles.sessionMeta}>
                  <Ionicons name="location-outline" size={13} color={colors.onSurfaceTertiary} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.meeting_point_name}</Text>
                  {item.distance_km ? (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>{item.distance_km} km</Text>
                    </>
                  ) : null}
                </View>
              </View>
              {item.my_rsvp === "going" && (
                <View style={styles.goingTag}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <StateView
              icon="calendar-outline"
              title="No runs this day"
              subtitle="Join a group and RSVP to sessions to fill your calendar."
              actionLabel="Find a group"
              onAction={() => router.push("/(tabs)")}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 40, letterSpacing: 1, paddingHorizontal: spacing.lg },
  subtitle: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  dayCell: {
    width: 56, height: 72, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    borderWidth: 1, gap: 2,
  },
  dayIdle: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  dayActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayName: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase" },
  dayNum: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 22 },
  dayTextActive: { color: colors.onBrandPrimary },
  dotMarker: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.brand, position: "absolute", bottom: 8 },
  sessionCard: {
    flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md, alignItems: "center",
  },
  timeCol: { alignItems: "center", width: 56 },
  time: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.sm },
  timeLine: { width: 2, flex: 1 },
  sessionBody: { flex: 1, gap: 2 },
  sessionTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  sessionGroup: { color: colors.brand, fontFamily: fonts.bodyMedium, fontSize: font.sm },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  metaText: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, flexShrink: 1 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary },
  goingTag: { alignItems: "center", justifyContent: "center" },
});
