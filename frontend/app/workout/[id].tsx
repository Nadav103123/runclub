import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Avatar, StateView } from "@/src/components/ui";
import LocationMap from "@/src/components/LocationMap";
import { api, resolveImage } from "@/src/api";
import { Session } from "@/src/types";
import { fmtDate, fmtTime } from "@/src/utils/format";

export default function WorkoutCoordinator() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await api.get<Session>(`/workouts/${id}`);
      setW(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setRsvp = async (status: "going" | "not_going") => {
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await api.post(`/workouts/${id}/rsvp`, { status });
      await load();
    } catch {}
    finally {
      setBusy(false);
    }
  };

  const cancelSession = async () => {
    setBusy(true);
    try {
      await api.del(`/workouts/${id}`);
      router.back();
    } catch {}
    finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /></View>;
  if (error || !w) return <View style={styles.center}><StateView icon="alert-circle-outline" title="Session unavailable" subtitle="It may have been cancelled." actionLabel="Go back" onAction={() => router.back()} /></View>;

  const lat = w.latitude ?? 37.7749;
  const lng = w.longitude ?? -122.4194;
  const going = w.my_rsvp === "going";
  const notGoing = w.my_rsvp === "not_going";

  return (
    <View style={styles.root}>
      {/* Map background */}
      <View style={styles.mapArea}>
        <LocationMap latitude={lat} longitude={lng} fullBleed />
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + spacing.sm }]} testID="workout-back">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        {w.is_admin && (
          <Pressable onPress={cancelSession} style={[styles.cancelBtn, { top: insets.top + spacing.sm }]} testID="cancel-session-button">
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* Bottom sheet panel */}
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <Text style={styles.groupName}>{w.group_name}</Text>
          <Text style={styles.title}>{w.title}</Text>

          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={16} color={colors.brand} />
            <Text style={styles.dateText}>{fmtDate(w.workout_date)}</Text>
            <View style={styles.metaDot} />
            <Ionicons name="time" size={16} color={colors.brand} />
            <Text style={styles.dateText}>{fmtTime(w.workout_date)}</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{w.distance_km ?? "—"}</Text>
              <Text style={styles.metricLabel}>KM</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue} numberOfLines={1}>{w.target_pace ?? "—"}</Text>
              <Text style={styles.metricLabel}>PACE</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{w.going_count}</Text>
              <Text style={styles.metricLabel}>GOING</Text>
            </View>
          </View>

          <View style={styles.locBox}>
            <Ionicons name="location" size={18} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locLabel}>MEETING POINT</Text>
              <Text style={styles.locName}>{w.meeting_point_name}</Text>
            </View>
          </View>

          {w.description ? <Text style={styles.desc}>{w.description}</Text> : null}

          <Text style={styles.attendeesLabel}>WHO'S RUNNING</Text>
          {w.attendees && w.attendees.length > 0 ? (
            <View style={styles.attendees}>
              {w.attendees.map((a) => (
                <View key={a.user_id} style={styles.attendeeChip}>
                  <Avatar uri={resolveImage(a.avatar_url)} name={a.full_name} size={32} />
                  <Text style={styles.attendeeName} numberOfLines={1}>{a.full_name.split(" ")[0]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noAttendees}>Be the first to RSVP going!</Text>
          )}
        </ScrollView>
      </View>

      {/* Sticky RSVP */}
      <View style={[styles.rsvpBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={() => setRsvp("not_going")}
          disabled={busy}
          style={[styles.rsvpBtn, notGoing ? styles.notGoingActive : styles.rsvpIdle]}
          testID="rsvp-not-going"
        >
          <Ionicons name="close-circle" size={18} color={notGoing ? colors.onError : colors.onSurfaceTertiary} />
          <Text style={[styles.rsvpText, { color: notGoing ? colors.onError : colors.onSurfaceTertiary }]}>Not Going</Text>
        </Pressable>
        <Pressable
          onPress={() => setRsvp("going")}
          disabled={busy}
          style={[styles.rsvpBtn, styles.goingBtn, going ? styles.goingActive : styles.goingIdle]}
          testID="rsvp-going"
        >
          {busy ? (
            <ActivityIndicator color={colors.onSuccess} />
          ) : (
            <>
              <Ionicons name={going ? "checkmark-circle" : "walk"} size={18} color={going ? colors.onSuccess : colors.onBrandPrimary} />
              <Text style={[styles.rsvpText, { color: going ? colors.onSuccess : colors.onBrandPrimary }]}>{going ? "You're Going" : "I'm Going"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  mapArea: { height: "38%" },
  backBtn: { position: "absolute", left: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  cancelBtn: { position: "absolute", right: spacing.md, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.md, height: 40, borderRadius: 20 },
  cancelText: { color: colors.error, fontFamily: fonts.bodySemi, fontSize: font.base },
  sheet: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, marginTop: -20, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  groupName: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.base, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 36, lineHeight: 38, marginTop: 2 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  dateText: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: font.base },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onSurfaceTertiary, marginHorizontal: spacing.xs },
  metricRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  metric: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", gap: 2, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 26 },
  metricLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm },
  locBox: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  locLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, letterSpacing: 0.5 },
  locName: { color: colors.onSurface, fontFamily: fonts.bodySemi, fontSize: font.lg },
  desc: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.lg, lineHeight: 24, marginTop: spacing.md },
  attendeesLabel: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  attendees: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  attendeeChip: { alignItems: "center", gap: spacing.xs, width: 60 },
  attendeeName: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.sm },
  noAttendees: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.base },
  rsvpBar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rsvpBtn: { flex: 1, height: 52, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1 },
  goingBtn: { flex: 1.4 },
  rsvpIdle: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  notGoingActive: { backgroundColor: colors.error, borderColor: colors.error },
  goingIdle: { backgroundColor: colors.brand, borderColor: colors.brand },
  goingActive: { backgroundColor: colors.success, borderColor: colors.success },
  rsvpText: { fontFamily: fonts.bodySemi, fontSize: font.lg },
});
