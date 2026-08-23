import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius, CATEGORIES, DAYS } from "@/src/theme";
import { Chip, ChipRow, StateView, TextField } from "@/src/components/ui";
import GroupCard from "@/src/components/GroupCard";
import { api } from "@/src/api";
import { Group } from "@/src/types";

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("All");
  const [day, setDay] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (city !== "All") params.append("city", city);
      if (day !== "All") params.append("day", day);
      if (search.trim()) params.append("search", search.trim());
      const qs = params.toString();
      const [g, c] = await Promise.all([
        api.get<Group[]>(`/groups${qs ? `?${qs}` : ""}`),
        api.get<string[]>("/groups/cities"),
      ]);
      setGroups(g);
      setCities(c);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, city, day, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Debounce search / filter changes.
  React.useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const clearFilters = () => {
    setCategory("All");
    setCity("All");
    setDay("All");
    setSearch("");
  };

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>DISCOVER</Text>
      <Text style={styles.subtitle}>Find your running crew</Text>
      <View style={styles.searchWrap}>
        <TextField
          icon="search-outline"
          placeholder="Search by name, city, or vibe"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
          testID="group-search-input"
        />
      </View>
      <View style={styles.filters}>
        <ChipRow>
          <Chip label="All" active={category === "All"} onPress={() => setCategory("All")} testID="cat-all" />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`cat-${c}`} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="All Cities" active={city === "All"} onPress={() => setCity("All")} testID="city-all" />
          {cities.map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} testID={`city-${c}`} />
          ))}
        </ChipRow>
        <ChipRow>
          <Chip label="Any Day" active={day === "All"} onPress={() => setDay("All")} testID="day-all" />
          {DAYS.map((d) => (
            <Chip key={d} label={d} active={day === d} onPress={() => setDay(d)} testID={`day-${d}`} />
          ))}
        </ChipRow>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>{Header}<ActivityIndicator color={colors.brand} style={{ marginTop: spacing["3xl"] }} /></View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={Header}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            error ? (
              <StateView icon="cloud-offline-outline" title="Unable to load groups" subtitle="Check your connection and try again." actionLabel="Retry" onAction={load} />
            ) : (
              <StateView icon="search-outline" title="No groups match your filters" subtitle="Try adjusting or clearing your filters." actionLabel="Clear Filters" onAction={clearFilters} />
            )
          }
        />
      )}

      <Pressable
        testID="create-group-fab"
        onPress={() => router.push("/group/create")}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + spacing.md }, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="add" size={28} color={colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1 },
  header: { backgroundColor: colors.surface, paddingBottom: spacing.sm },
  title: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 40, letterSpacing: 1, paddingHorizontal: spacing.lg },
  subtitle: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  filters: { gap: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
