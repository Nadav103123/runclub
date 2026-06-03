import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { COLORS, CITIES, MARKET_CATS, CONDITIONS } from '../constants';
import { CityFilter, EmptyState } from '../components/UI';
import BottomSheet from '../components/BottomSheet';
import { FInput, FPicker, SubmitButton, Row } from '../components/FormFields';
import { useAppStore } from '../hooks/useAppStore';
import { Listing } from '../constants/types';
import { MY_USER_ID } from '../constants';

const EMOJI_MAP: Record<string, string> = { נעליים: '👟', ביגוד: '👕', אביזרים: '⌚' };

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{listing.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.desc}>{listing.description}</Text>
          <View style={styles.tags}>
            <View style={styles.condBadge}>
              <Text style={styles.condText}>{listing.condition}</Text>
            </View>
            <Text style={styles.meta}>📍 {listing.city}</Text>
            <Text style={styles.meta}>{listing.userName}</Text>
          </View>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>₪{listing.price}</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Alert.alert('פנייה', `שלחת הודעה ל-${listing.userName}`)}
          >
            <Text style={styles.contactBtnText}>פנה</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function MarketScreen() {
  const { state, dispatch } = useAppStore();
  const [city, setCity] = useState('הכל');
  const [cat, setCat] = useState('הכל');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'נעליים',
    condition: 'משומש מעט',
    price: '',
    city: '',
    description: '',
  });
  const sf = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submitListing = useCallback(() => {
    if (!form.title.trim() || !form.price || !form.city.trim()) return;
    const listing: Listing = {
      id: 'l' + Date.now(),
      userId: MY_USER_ID,
      userName: 'אני',
      ...form,
      price: Number(form.price),
      emoji: EMOJI_MAP[form.category] || '📦',
    };
    dispatch({ type: 'ADD_LISTING', listing });
    setShowAdd(false);
    setForm({ title: '', category: 'נעליים', condition: 'משומש מעט', price: '', city: '', description: '' });
  }, [form]);

  const filtered = state.listings
    .filter((l) => city === 'הכל' || l.city === city)
    .filter((l) => cat === 'הכל' || l.category === cat);

  return (
    <View style={styles.container}>
      <CityFilter cities={CITIES} selected={city} onChange={setCity} accent={COLORS.teal} />

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {MARKET_CATS.map((c) => {
            const active = cat === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCat(c)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? 'rgba(56,232,198,0.15)' : 'rgba(255,255,255,0.05)', borderColor: active ? COLORS.teal : 'rgba(255,255,255,0.1)' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? COLORS.teal : COLORS.text.muted }]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.count}>{filtered.length} מוצרים</Text>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        ListEmptyComponent={<EmptyState icon="🛍️" text="אין מוצרים" />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: COLORS.teal }]} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ מוצר</Text>
      </TouchableOpacity>

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)} title="🛒 פרסם מוצר" titleColor={COLORS.teal}>
        <FInput label="שם המוצר" value={form.title} onChangeText={(v) => sf('title', v)} placeholder="Nike Pegasus 40 — מ42" />
        <FPicker label="קטגוריה" value={form.category} options={['נעליים', 'ביגוד', 'אביזרים']} onChange={(v) => sf('category', v)} accent={COLORS.teal} />
        <FPicker label="מצב" value={form.condition} options={CONDITIONS} onChange={(v) => sf('condition', v)} accent={COLORS.teal} />
        <Row>
          <View style={{ flex: 1 }}>
            <FInput label="מחיר (₪)" value={form.price} onChangeText={(v) => sf('price', v)} keyboardType="numeric" placeholder="350" />
          </View>
          <View style={{ flex: 1 }}>
            <FInput label="עיר" value={form.city} onChangeText={(v) => sf('city', v)} placeholder="תל אביב" />
          </View>
        </Row>
        <FInput label="תיאור" value={form.description} onChangeText={(v) => sf('description', v)} multiline numberOfLines={3} placeholder="ספר על המוצר..." />
        <SubmitButton label="פרסם מוצר 🛍️" onPress={submitListing} color={COLORS.teal} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  count: { fontSize: 11, color: COLORS.text.hint, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  emojiBox: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  title: { fontWeight: '700', fontSize: 13, color: COLORS.text.primary, marginBottom: 2 },
  desc: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 5 },
  tags: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', alignItems: 'center' },
  condBadge: { backgroundColor: 'rgba(56,232,198,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  condText: { fontSize: 11, color: COLORS.teal },
  meta: { fontSize: 11, color: COLORS.text.muted },
  priceCol: { alignItems: 'center' },
  price: { color: COLORS.yellow, fontWeight: '900', fontSize: 17 },
  contactBtn: { backgroundColor: COLORS.teal, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 },
  contactBtnText: { color: '#000', fontSize: 11, fontWeight: '800' },
  chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 16, left: 16, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9 },
  fabText: { color: '#000', fontWeight: '800', fontSize: 13 },
});
