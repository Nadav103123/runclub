import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Button, TextField } from "@/src/components/ui";
import { api } from "@/src/api";

export default function LogRun() {
  const { workoutId, distance: presetDistance, mins, secs, title } = useLocalSearchParams<{
    workoutId: string;
    distance?: string;
    mins?: string;
    secs?: string;
    title?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [distance, setDistance] = useState(presetDistance || "");
  const [minutes, setMinutes] = useState(mins || "");
  const [seconds, setSeconds] = useState(secs || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pace = (() => {
    const d = parseFloat(distance);
    const total = (parseInt(minutes || "0", 10) || 0) * 60 + (parseInt(seconds || "0", 10) || 0);
    if (!d || !total) return null;
    const p = Math.round(total / d);
    return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`;
  })();

  const submit = async () => {
    setError("");
    const d = parseFloat(distance);
    const total = (parseInt(minutes || "0", 10) || 0) * 60 + (parseInt(seconds || "0", 10) || 0);
    if (!d || d <= 0) {
      setError("Enter a valid distance.");
      return;
    }
    if (total <= 0) {
      setError("Enter your run time.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/workouts/${workoutId}/log`, { distance_km: d, duration_seconds: total });
      router.back();
    } catch {
      setError("Could not save your run.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.close} testID="log-close">
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Log Your Run</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.md }}
        bottomOffset={24}
      >
        {title ? <Text style={styles.sessionTitle}>{title}</Text> : null}
        <Text style={styles.hint}>Record what you actually ran — it powers your bests, badges, and the leaderboard.</Text>

        <TextField
          label="Distance (km)"
          icon="footsteps-outline"
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          placeholder="10.0"
          testID="log-distance-input"
        />

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <TextField value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="Min" testID="log-minutes-input" />
          </View>
          <Text style={styles.colon}>:</Text>
          <View style={{ flex: 1 }}>
            <TextField value={seconds} onChangeText={setSeconds} keyboardType="number-pad" placeholder="Sec" testID="log-seconds-input" />
          </View>
        </View>

        <View style={styles.pacePreview}>
          <Ionicons name="speedometer-outline" size={18} color={colors.brand} />
          <Text style={styles.paceText}>Pace: {pace ? `${pace} min/km` : "—"}</Text>
        </View>

        {error ? <Text style={styles.error} testID="log-error">{error}</Text> : null}

        <View style={{ marginTop: spacing.sm }}>
          <Button title="Save Run" icon="checkmark" onPress={submit} loading={saving} testID="submit-log-button" />
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
  sessionTitle: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.base, textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.base, lineHeight: 20 },
  label: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  colon: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 28 },
  pacePreview: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  paceText: { color: colors.onSurface, fontFamily: fonts.bodySemi, fontSize: font.lg },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: font.base },
});
