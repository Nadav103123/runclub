import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, CITIES, LEVELS } from '../constants';
import { CityFilter, EmptyState } from '../components/UI';
import WorkoutCard from '../components/WorkoutCard';
import BottomSheet from '../components/BottomSheet';
import { FInput, FPicker, SubmitButton, Row } from '../components/FormFields';
import { useAppStore } from '../hooks/useAppStore';
import { GROUPS } from '../data/mockData';
import { Workout } from '../constants/types';

export default function DiscoverScreen() {
  const { state, dispatch } = useAppStore();
  const [city, setCity] = useState('הכל');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // ── New workout form state ────────────────────────────────────────────────
  const [form, setForm] = useState({
    groupId: GROUPS[0].id,
    title: '',
    date: '',
    time: '07:00',
    location: '',
    distance: '',
    pace: '',
    level: 'בינוני',
    spots: '20',
    description: '',
  });
  const sf = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const submitWorkout = useCallback(() => {
    if (!form.title.trim() || !form.date.trim() || !form.location.trim()) return;
    const g = GROUPS.find((x) => x.id === form.groupId);
    const newWorkout: Workout = {
      ...form,
      id: 'w' + Date.now(),
      groupName: g?.name || '',
      city: g?.city || '',
      spots: Number(form.spots) || 20,
      registered: [],
    };
    dispatch({ type: 'ADD_WORKOUT', workout: newWorkout });
    setShowAdd(false);
    setForm({ groupId: GROUPS[0].id, title: '', date: '', time: '07:00', location: '', distance: '', pace: '', level: 'בינוני', spots: '20', description: '' });
  }, [form]);

  const filtered = state.workouts
    .filter((w) => city === 'הכל' || w.city === city)
    .filter((w) => {
      const q = search.toLowerCase();
      return !q || w.title.includes(q) || w.groupName.includes(q) || w.location.includes(q);
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="חפש אימון, קבוצה או מיקום..."
          placeholderTextColor={COLORS.text.hint}
          style={styles.searchInput}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: COLORS.text.muted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* City filter */}
      <CityFilter cities={CITIES} selected={city} onChange={setCity} />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} groups={GROUPS} />}
        ListEmptyComponent={<EmptyState icon="🔍" text="לא נמצאו אימונים" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ אימון</Text>
      </TouchableOpacity>

      {/* Add workout sheet */}
      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)} title="➕ פרסם אימון">
        <FPicker
          label="קבוצה"
          value={GROUPS.find((g) => g.id === form.groupId)?.name || ''}
          options={GROUPS.map((g) => g.name)}
          onChange={(name) => {
            const g = GROUPS.find((x) => x.name === name);
            if (g) sf('groupId', g.id);
          }}
        />
        <FInput label="שם האימון" value={form.title} onChangeText={(v) => sf('title', v)} placeholder="ריצת ארוכה שבועית" />
        <Row>
          <View style={{ flex: 1 }}>
            <FInput label="תאריך (YYYY-MM-DD)" value={form.date} onChangeText={(v) => sf('date', v)} placeholder="2026-06-15" />
          </View>
          <View style={{ flex: 1 }}>
            <FInput label="שעה" value={form.time} onChangeText={(v) => sf('time', v)} placeholder="07:00" />
          </View>
        </Row>
        <FInput label="מיקום" value={form.location} onChangeText={(v) => sf('location', v)} placeholder="פארק הירקון — כניסה ראשית" />
        <Row>
          <View style={{ flex: 1 }}>
            <FInput label="מרחק" value={form.distance} onChangeText={(v) => sf('distance', v)} placeholder='10 ק״מ' />
          </View>
          <View style={{ flex: 1 }}>
            <FInput label="טמפו" value={form.pace} onChangeText={(v) => sf('pace', v)} placeholder='5:30/ק״מ' />
          </View>
        </Row>
        <FPicker label="רמה" value={form.level} options={LEVELS} onChange={(v) => sf('level', v)} />
        <FInput label='מקסימום משתתפים' value={form.spots} onChangeText={(v) => sf('spots', v)} keyboardType="numeric" />
        <FInput label="תיאור האימון" value={form.description} onChangeText={(v) => sf('description', v)} placeholder="מה עושים בפועל?" multiline numberOfLines={3} />
        <SubmitButton label="פרסם 🚀" onPress={submitWorkout} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 14,
  },
  searchIcon: { color: COLORS.text.hint, fontSize: 16 },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 13,
    padding: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: COLORS.yellow,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  fabText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
