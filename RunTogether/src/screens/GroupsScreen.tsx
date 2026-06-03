import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, CITIES } from '../constants';
import { CityFilter, VerifiedBadge } from '../components/UI';
import { useAppStore } from '../hooks/useAppStore';
import { GROUPS } from '../data/mockData';
import { Group } from '../constants/types';

function GroupCard({ group, workoutCount, isFollowing, onToggleFollow }: {
  group: Group;
  workoutCount: number;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <View style={[styles.card, { borderRightColor: group.color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.groupLeft}>
          <Text style={styles.logo}>{group.logo}</Text>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{group.name}</Text>
              {group.verified && <VerifiedBadge size={13} />}
            </View>
            <Text style={styles.city}>📍 {group.city}</Text>
          </View>
        </View>
        <View style={styles.membersCol}>
          <Text style={[styles.membersNum, { color: group.color }]}>{group.members}</Text>
          <Text style={styles.membersLabel}>חברים</Text>
        </View>
      </View>

      <Text style={styles.desc}>{group.description}</Text>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerMeta}>{workoutCount} אימונים קרובים</Text>
          {group.verified ? (
            <Text style={styles.instagram}>📸 @{group.instagram}</Text>
          ) : (
            <Text style={styles.unverified}>⚠️ לא מאומתת</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onToggleFollow}
          style={[
            styles.followBtn,
            isFollowing
              ? { backgroundColor: 'rgba(232,255,71,0.1)', borderColor: COLORS.yellow }
              : { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)' },
          ]}
        >
          <Text style={[styles.followBtnText, { color: isFollowing ? COLORS.yellow : '#aaa' }]}>
            {isFollowing ? '✓ עוקב' : '+ עקוב'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GroupsScreen() {
  const { state, dispatch } = useAppStore();
  const [city, setCity] = useState('הכל');

  const filtered = GROUPS.filter((g) => city === 'הכל' || g.city === city);

  return (
    <View style={styles.container}>
      <CityFilter cities={CITIES} selected={city} onChange={setCity} accent={COLORS.orange} />

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => {
          const count = state.workouts.filter((w) => w.groupId === item.id).length;
          const following = state.following.includes(item.id);
          return (
            <GroupCard
              group={item}
              workoutCount={count}
              isFollowing={following}
              onToggleFollow={() => dispatch({ type: 'TOGGLE_FOLLOW', groupId: item.id })}
            />
          );
        }}
        ListFooterComponent={
          <View style={styles.verifiedNote}>
            <VerifiedBadge size={11} />
            <Text style={styles.verifiedText}>
              {'  '}<Text style={{ color: '#1D9BF0', fontWeight: '700' }}>ווי כחול</Text>
              {' — קבוצה שחיברה אינסטגרם פעיל ועברה אימות.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 9,
    borderRightWidth: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  groupLeft: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  logo: { fontSize: 24 },
  nameRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  name: { fontWeight: '800', fontSize: 14, color: COLORS.text.primary },
  city: { fontSize: 11, color: COLORS.text.muted },
  membersCol: { alignItems: 'center' },
  membersNum: { fontWeight: '800', fontSize: 16 },
  membersLabel: { fontSize: 10, color: COLORS.text.hint },
  desc: { fontSize: 12, color: '#999', marginBottom: 9 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', gap: 10 },
  footerMeta: { fontSize: 11, color: COLORS.text.muted },
  instagram: { fontSize: 11, color: '#1D9BF0' },
  unverified: { fontSize: 11, color: COLORS.text.hint },
  followBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  followBtnText: { fontSize: 11, fontWeight: '700' },
  verifiedNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(29,155,240,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(29,155,240,0.18)',
    borderRadius: 12,
    padding: 11,
    marginTop: 5,
  },
  verifiedText: { fontSize: 12, color: '#aaa', lineHeight: 18, flex: 1 },
});
