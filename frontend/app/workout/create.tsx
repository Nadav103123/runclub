import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Button, TextField, Chip } from "@/src/components/ui";
import LocationMap from "@/src/components/LocationMap";
import { api } from "@/src/api";
import { Session } from "@/src/types";

const TIMES = [
  { label: "5:30 AM", h: 5, m: 30 },
  { label: "6:00 AM", h: 6, m: 0 },
  { label: "6:30 AM", h: 6, m: 30 },
  { label: "7:00 AM", h: 7, m: 0 },
  { label: "8:00 AM", h: 8, m: 0 },
  { label: "5:30 PM", h: 17, m: 30 },
  { label: "6:00 PM", h: 18, m: 0 },
  { label: "6:30 PM", h: 18, m: 30 },
];

export default function CreateWorkout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [distance, setDistance] = useState("");
  const [pace, setPace] = useState("");
  const [dayIdx, setDayIdx] = useState(1);
  const [timeIdx, setTimeIdx] = useState(3);
  const [coord, setCoord] = useState({ latitude: 37.7749, longitude: -122.4194 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const days = Array.from({ length: 14 }, (_, i) => dayjs().add(i, "day"));

  const submit = async () => {
    setError("");
    if (!title || !meetingPoint) {
      setError("Title and meeting point are required.");
      return;
    }
    const t = TIMES[timeIdx];
    const date = days[dayIdx].hour(t.h).minute(t.m).second(0).millisecond(0);
    setSaving(true);
    try {
      const w = await api.post<Session>(`/groups/${groupId}/workouts`, {
        title,
        description,
        workout_date: date.toISOString(),
        meeting_point_name: meetingPoint,
        latitude: coord.latitude,
        longitude: coord.longitude,
        distance_km: distance ? parseFloat(distance) : null,
        target_pace: pace || null,
      });
      router.replace(`/workout/${w.id}`);
    } catch {
      setError("Could not create session.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.close} testID="create-workout-close">
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New Session</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.md }}
        bottomOffset={24}
      >
        <TextField label="Session title" value={title} onChangeText={setTitle} placeholder="Tempo Tuesday" testID="workout-title-input" />

        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {days.map((d, i) => (
            <Pressable key={i} onPress={() => setDayIdx(i)} style={[styles.dayCell, dayIdx === i ? styles.dayActive : styles.dayIdle]} testID={`workout-day-${i}`}>
              <Text style={[styles.dayName, dayIdx === i && styles.activeText]}>{d.format("ddd")}</Text>
              <Text style={[styles.dayNum, dayIdx === i && styles.activeText]}>{d.format("D")}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Start time</Text>
        <View style={styles.wrapRow}>
          {TIMES.map((t, i) => (
            <Chip key={t.label} label={t.label} active={timeIdx === i} onPress={() => setTimeIdx(i)} testID={`workout-time-${i}`} />
          ))}
        </View>

        <TextField label="Meeting point" icon="flag-outline" value={meetingPoint} onChangeText={setMeetingPoint} placeholder="Ferry Building Plaza" testID="workout-meeting-input" />

        <Text style={styles.label}>Pin the meeting point</Text>
        <LocationMap
          latitude={coord.latitude}
          longitude={coord.longitude}
          pickable
          onPick={(latitude, longitude) => setCoord({ latitude, longitude })}
          height={200}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="Distance (km)" value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="10" testID="workout-distance-input" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Target pace" value={pace} onChangeText={setPace} placeholder="5:00 - 5:30" testID="workout-pace-input" />
          </View>
        </View>

        <TextField label="Notes" value={description} onChangeText={setDescription} placeholder="Anything runners should know?" multiline testID="workout-notes-input" />

        {error ? <Text style={styles.error} testID="create-workout-error">{error}</Text> : null}

        <View style={{ marginTop: spacing.sm }}>
          <Button title="Create Session" onPress={submit} loading={saving} testID="submit-workout-button" />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  label: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  strip: { gap: spacing.sm, paddingVertical: spacing.xs },
  dayCell: { width: 52, height: 64, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, gap: 2 },
  dayIdle: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  dayActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayName: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase" },
  dayNum: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 20 },
  activeText: { color: colors.onBrandPrimary },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: font.base },
});
