import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { EmptyState } from '../components/UI';
import WorkoutCard from '../components/WorkoutCard';
import { useAppStore } from '../hooks/useAppStore';
import { GROUPS } from '../data/mockData';
import { MY_USER_ID } from '../constants';
import { useRouter } from 'expo-router';

export default function MyWorkoutsScreen() {
  const { state } = useAppStore();
  const router = useRouter();

  const mine = state.workouts
    .filter((w) => w.registered.includes(MY_USER_ID))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View style={styles.container}>
      {mine.length > 0 && (
        <Text style={styles.count}>נרשמת ל-{mine.length} אימונים</Text>
      )}
      <FlatList
        data={mine}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} groups={GROUPS} />}
        ListEmptyComponent={
          <EmptyState
            icon="🏃"
            text="עדיין לא נרשמת לאימון"
            actionLabel="גלה אימונים"
            onAction={() => router.push('/')}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  count: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginBottom: 12,
  },
});
