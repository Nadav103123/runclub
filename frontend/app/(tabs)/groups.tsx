import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fonts, font } from "@/src/theme";
import { StateView } from "@/src/components/ui";
import GroupCard from "@/src/components/GroupCard";
import { api } from "@/src/api";
import { Group } from "@/src/types";

export default function MyGroups() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Group[]>("/my/groups");
      setGroups(data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const admin = groups.filter((g) => g.my_status === "admin");
  const member = groups.filter((g) => g.my_status === "approved");
  const pending = groups.filter((g) => g.my_status === "pending");

  const sections = [
    { key: "admin", label: "Groups I Lead", data: admin },
    { key: "member", label: "Member Of", data: member },
    { key: "pending", label: "Pending Approval", data: pending },
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>MY GROUPS</Text>
        <Text style={styles.subtitle}>Your running communities</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.key}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          renderItem={({ item }) => (
            <View style={{ gap: spacing.md }}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>{item.label}</Text>
                <Text style={styles.sectionCount}>{item.data.length}</Text>
              </View>
              {item.data.map((g) => (
                <GroupCard key={g.id} group={g} onPress={() => router.push(`/group/${g.id}`)} />
              ))}
            </View>
          )}
          ListEmptyComponent={
            <StateView
              icon="people-outline"
              title="No groups yet"
              subtitle="Discover and join a running group to get started."
              actionLabel="Discover groups"
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
  header: { paddingBottom: spacing.sm },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 40, letterSpacing: 1, paddingHorizontal: spacing.lg },
  subtitle: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.lg, paddingHorizontal: spacing.lg },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionLabel: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl, textTransform: "uppercase" },
  sectionCount: {
    color: colors.brand, fontFamily: fonts.bodySemi, fontSize: font.sm,
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, overflow: "hidden",
  },
});
