import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Avatar, StateView } from "@/src/components/ui";
import { api, resolveImage } from "@/src/api";
import { Member } from "@/src/types";

export default function ManageMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Member[]>(`/groups/${id}/members`);
      setMembers(data);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (userId: string, action: "approve" | "reject") => {
    setBusy(userId);
    try {
      await api.post(`/groups/${id}/members/${userId}/${action}`);
      await load();
    } catch {}
    finally {
      setBusy(null);
    }
  };

  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "approved" || m.status === "admin");

  const data = [
    { key: "pending", label: `Pending Requests (${pending.length})`, items: pending, isPending: true },
    { key: "active", label: `Members (${active.length})`, items: active, isPending: false },
  ].filter((s) => s.items.length > 0);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="members-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(s) => s.key}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.xl }}
          renderItem={({ item: section }) => (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.items.map((m) => (
                <View key={m.user_id} style={styles.memberRow} testID={`member-${m.user_id}`}>
                  <Avatar uri={resolveImage(m.avatar_url)} name={m.full_name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.full_name}</Text>
                    <Text style={styles.memberPace}>{m.status === "admin" ? "Group Leader" : m.pace_min_km ? `${m.pace_min_km} min/km` : "Runner"}</Text>
                  </View>
                  {section.isPending ? (
                    <View style={styles.actions}>
                      {busy === m.user_id ? (
                        <ActivityIndicator color={colors.brand} />
                      ) : (
                        <>
                          <Pressable onPress={() => act(m.user_id, "reject")} style={[styles.iconBtn, styles.rejectBtn]} testID={`reject-${m.user_id}`}>
                            <Ionicons name="close" size={20} color={colors.error} />
                          </Pressable>
                          <Pressable onPress={() => act(m.user_id, "approve")} style={[styles.iconBtn, styles.approveBtn]} testID={`approve-${m.user_id}`}>
                            <Ionicons name="checkmark" size={20} color={colors.onSuccess} />
                          </Pressable>
                        </>
                      )}
                    </View>
                  ) : m.status === "admin" ? (
                    <View style={styles.adminTag}><Ionicons name="star" size={14} color={colors.brand} /></View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={<StateView icon="people-outline" title="No members yet" subtitle="Share your group to grow the tribe." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  sectionLabel: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, textTransform: "uppercase" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  memberName: { color: colors.onSurface, fontFamily: fonts.bodySemi, fontSize: font.lg },
  memberPace: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rejectBtn: { backgroundColor: "rgba(255,23,68,0.15)" },
  approveBtn: { backgroundColor: colors.success },
  adminTag: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
});
