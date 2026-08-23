import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Avatar, Button, TextField, StateView } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";
import { api, uploadImage, resolveImage } from "@/src/api";
import { Group, User } from "@/src/types";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser, signOut, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState(user?.location || "");
  const [pace, setPace] = useState(user?.pace_min_km || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<{ total_km: number; total_runs: number; streak_weeks: number; upcoming: number; longest_km: number; best_pace: string | null } | null>(null);
  const [permMsg, setPermMsg] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const [g, s] = await Promise.all([
        api.get<Group[]>("/my/groups"),
        api.get<{ total_km: number; total_runs: number; streak_weeks: number; upcoming: number; longest_km: number; best_pace: string | null }>("/my/stats"),
      ]);
      setGroups(g);
      setStats(s);
    } catch {}
  }, []);

  const toggleReminder = async (key: string) => {
    if (!user) return;
    const current = user.reminder_prefs || ["1d", "1h"];
    const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
    setSavingPrefs(true);
    try {
      const updated = await api.put<User>("/auth/profile", { reminder_prefs: next });
      setUser(updated);
    } catch {}
    finally {
      setSavingPrefs(false);
    }
  };

  useFocusEffect(useCallback(() => { loadGroups(); refreshUser(); }, [loadGroups]));

  const startEdit = () => {
    setName(user?.full_name || "");
    setBio(user?.bio || "");
    setLocation(user?.location || "");
    setPace(user?.pace_min_km || "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put<User>("/auth/profile", {
        full_name: name,
        bio,
        location,
        pace_min_km: pace,
      });
      setUser(updated);
      setEditing(false);
    } catch {}
    finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    setPermMsg("");
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = perm.status;
    if (status !== "granted") {
      if (!perm.canAskAgain) {
        setPermMsg("Photo access is blocked. Enable it in Settings to change your avatar.");
        return;
      }
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = req.status;
      if (status !== "granted") {
        if (!req.canAskAgain) setPermMsg("Photo access is blocked. Enable it in Settings.");
        else setPermMsg("Photo access is needed to set your avatar.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(result.assets[0].uri);
      const updated = await api.put<User>("/auth/profile", { avatar_url: url });
      setUser(updated);
    } catch {}
    finally {
      setUploading(false);
    }
  };

  if (!user) {
    return <View style={styles.root}><ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} /></View>;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      bottomOffset={24}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>PROFILE</Text>
        {!editing && (
          <Pressable onPress={startEdit} style={styles.editBtn} testID="edit-profile-button">
            <Ionicons name="create-outline" size={18} color={colors.brand} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.avatarRow}>
        <Pressable onPress={pickAvatar} testID="avatar-picker" style={styles.avatarWrap}>
          <Avatar uri={resolveImage(user.avatar_url)} name={user.full_name} size={96} />
          <View style={styles.camBadge}>
            {uploading ? <ActivityIndicator size="small" color={colors.onBrandPrimary} /> : <Ionicons name="camera" size={16} color={colors.onBrandPrimary} />}
          </View>
        </Pressable>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {permMsg ? (
        <View style={styles.permBox}>
          <Text style={styles.permText}>{permMsg}</Text>
          <Button title="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} testID="open-settings-button" />
        </View>
      ) : null}

      {!editing && stats && (
        <View style={styles.runStats}>
          <View style={styles.runStatTile}>
            <Ionicons name="flame" size={22} color={colors.brand} />
            <Text style={styles.runStatValue}>{stats.streak_weeks}</Text>
            <Text style={styles.runStatLabel}>Week Streak</Text>
          </View>
          <View style={styles.runStatTile}>
            <Ionicons name="footsteps" size={22} color={colors.brand} />
            <Text style={styles.runStatValue}>{stats.total_km}</Text>
            <Text style={styles.runStatLabel}>Total KM</Text>
          </View>
          <View style={styles.runStatTile}>
            <Ionicons name="trophy" size={22} color={colors.brand} />
            <Text style={styles.runStatValue}>{stats.total_runs}</Text>
            <Text style={styles.runStatLabel}>Runs Done</Text>
          </View>
        </View>
      )}

      {!editing && stats && (stats.total_runs > 0) && (
        <View style={styles.pbSection}>
          <Text style={styles.sectionHeading}>PERSONAL BESTS</Text>
          <View style={styles.pbRow}>
            <View style={styles.pbCard}>
              <View style={styles.pbIcon}><Ionicons name="trending-up" size={20} color={colors.brand} /></View>
              <View>
                <Text style={styles.pbValue}>{stats.longest_km} km</Text>
                <Text style={styles.pbLabel}>Longest Run</Text>
              </View>
            </View>
            <View style={styles.pbCard}>
              <View style={styles.pbIcon}><Ionicons name="flash" size={20} color={colors.brand} /></View>
              <View>
                <Text style={styles.pbValue}>{stats.best_pace ? `${stats.best_pace}` : "—"}</Text>
                <Text style={styles.pbLabel}>Best Pace min/km</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {!editing && (
        <View style={styles.reminderSection}>
          <Text style={styles.sectionHeading}>RUN REMINDERS</Text>
          <Text style={styles.reminderSub}>Get nudged before sessions you're going to</Text>
          <View style={styles.reminderRow}>
            {[
              { key: "1d", label: "Day before", icon: "calendar-outline" as const },
              { key: "1h", label: "Hour before", icon: "time-outline" as const },
            ].map((opt) => {
              const on = (user.reminder_prefs || ["1d", "1h"]).includes(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  disabled={savingPrefs}
                  onPress={() => toggleReminder(opt.key)}
                  style={[styles.reminderPill, on ? styles.reminderOn : styles.reminderOff]}
                  testID={`reminder-toggle-${opt.key}`}
                >
                  <Ionicons name={on ? "checkmark-circle" : opt.icon} size={18} color={on ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
                  <Text style={[styles.reminderText, { color: on ? colors.onBrandPrimary : colors.onSurfaceSecondary }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {editing ? (
        <View style={styles.form}>
          <TextField label="Full name" value={name} onChangeText={setName} testID="profile-name-input" />
          <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="Tell runners about yourself" multiline testID="profile-bio-input" />
          <TextField label="Location" icon="location-outline" value={location} onChangeText={setLocation} placeholder="City" testID="profile-location-input" />
          <TextField label="Target pace (min/km)" icon="speedometer-outline" value={pace} onChangeText={setPace} placeholder="5:00" testID="profile-pace-input" />
          <View style={styles.editActions}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} testID="cancel-edit-button" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Save" onPress={save} loading={saving} testID="save-profile-button" />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.info}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{user.pace_min_km || "—"}</Text>
              <Text style={styles.statLabel}>Pace min/km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="location" size={20} color={colors.brand} />
              <Text style={styles.statLabel} numberOfLines={1}>{user.location || "Set location"}</Text>
            </View>
          </View>
          {user.bio ? (
            <View style={styles.bioBox}>
              <Text style={styles.bioLabel}>ABOUT</Text>
              <Text style={styles.bio}>{user.bio}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.shelf}>
        <Text style={styles.shelfTitle}>MY GROUPS</Text>
        {groups.length === 0 ? (
          <Text style={styles.shelfEmpty}>You haven't joined any groups yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
            {groups.map((g) => (
              <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)} style={styles.miniCard} testID={`profile-group-${g.id}`}>
                <Ionicons name="flag" size={20} color={colors.brand} />
                <Text style={styles.miniName} numberOfLines={2}>{g.name}</Text>
                <Text style={styles.miniMeta}>{g.member_count} members</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <Button title="Sign Out" variant="outline" icon="log-out-outline" onPress={signOut} testID="sign-out-button" />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 40, letterSpacing: 1 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.pill },
  editText: { color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.base },
  avatarRow: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg },
  avatarWrap: { marginBottom: spacing.sm },
  camBadge: {
    position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.surface,
  },
  name: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 28 },
  email: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.base },
  permBox: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  permText: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.base },
  runStats: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  runStatTile: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  runStatValue: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 30 },
  runStatLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase" },
  sectionHeading: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, marginBottom: spacing.md },
  pbSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  pbRow: { flexDirection: "row", gap: spacing.md },
  pbCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  pbIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  pbValue: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  pbLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
  reminderSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  reminderSub: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, marginTop: -spacing.sm, marginBottom: spacing.md },
  reminderRow: { flexDirection: "row", gap: spacing.md },
  reminderPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 48, borderRadius: radius.md, borderWidth: 1 },
  reminderOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  reminderOff: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  reminderText: { fontFamily: fonts.bodySemi, fontSize: font.base },
  form: { paddingHorizontal: spacing.lg, gap: spacing.md },
  editActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  info: { paddingHorizontal: spacing.lg, gap: spacing.md },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 24 },
  statLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, textTransform: "uppercase" },
  bioBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  bioLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodySemi, fontSize: font.sm, letterSpacing: 0.5 },
  bio: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.lg, lineHeight: 22 },
  shelf: { marginTop: spacing.xl, gap: spacing.md },
  shelfTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, paddingHorizontal: spacing.lg },
  shelfEmpty: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.base, paddingHorizontal: spacing.lg },
  miniCard: { width: 140, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  miniName: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.lg },
  miniMeta: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
});
