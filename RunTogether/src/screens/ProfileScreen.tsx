import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { VerifiedBadge, StatCard, SectionTitle } from '../components/UI';
import { GROUPS, USER_PROFILE } from '../data/mockData';
import { useAppStore } from '../hooks/useAppStore';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const size = 64;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const stroke = Math.min(1, pct / 100) * circ;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={COLORS.yellow}
        strokeWidth={5}
        strokeDasharray={`${stroke} ${circ}`}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

// ── Weekly Bar Chart ──────────────────────────────────────────────────────────
function WeeklyChart({ data, goal }: { data: number[]; goal: number }) {
  const days = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];
  const maxVal = Math.max(...data, goal);
  const chartH = 52;
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 70 }}>
      {data.map((km, i) => {
        const barH = Math.max(3, Math.round((km / maxVal) * chartH));
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={styles.barVal}>{km}</Text>
            <View
              style={[
                styles.bar,
                { height: barH, backgroundColor: i === data.length - 1 ? COLORS.yellow : 'rgba(232,255,71,0.22)' },
              ]}
            />
            <Text style={styles.barDay}>{days[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { state } = useAppStore();
  const p = USER_PROFILE;
  const thisWeek = p.weeklyKm[p.weeklyKm.length - 1];
  const pct = Math.min(100, Math.round((thisWeek / p.weeklyGoal) * 100));
  const followedGroups = GROUPS.filter((g) => state.following.includes(g.id));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroName}>{p.name}</Text>
            <Text style={styles.heroCity}>📍 {p.city}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.watchBadge}>
                <Text style={styles.watchBadgeText}>⌚ {p.watch}</Text>
              </View>
              <Text style={styles.streakBadge}>🔥 {p.stats.currentStreak} ימים ברצף</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ProgressRing pct={pct} />
            <Text style={styles.ringEmoji}>🏃</Text>
          </View>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>יעד שבועי</Text>
          <Text style={styles.goalValue}>
            {thisWeek} / {p.weeklyGoal} ק״מ ({pct}%)
          </Text>
        </View>
        <View style={styles.progBg}>
          <View style={[styles.progFill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statGrid}>
        <StatCard value={p.stats.totalKm.toLocaleString()} label="ק״מ סה״כ" color={COLORS.yellow} />
        <StatCard value={String(p.stats.totalRuns)} label="ריצות" color={COLORS.yellow} />
        <StatCard value={p.stats.bestPace} label="שיא טמפו" color={COLORS.orange} />
        <StatCard value={`${p.stats.longestRun}ק״מ`} label="הכי ארוך" color={COLORS.teal} />
      </View>

      {/* Weekly chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>ק״מ — שבועות אחרונים</Text>
        <WeeklyChart data={p.weeklyKm} goal={p.weeklyGoal} />
      </View>

      {/* Following */}
      <SectionTitle>קבוצות שאני עוקב</SectionTitle>
      <View style={styles.followRow}>
        {followedGroups.map((g) => (
          <View key={g.id} style={[styles.followCard, { borderColor: g.color + '44' }]}>
            <Text style={styles.followLogo}>{g.logo}</Text>
            <View style={styles.followNameRow}>
              <Text style={styles.followName}>{g.name}</Text>
              {g.verified && <VerifiedBadge size={10} />}
            </View>
            <Text style={styles.followCity}>{g.city}</Text>
          </View>
        ))}
        <View style={styles.addFollowCard}>
          <Text style={styles.addFollowPlus}>+</Text>
        </View>
      </View>

      {/* Recent runs */}
      <SectionTitle style={{ marginTop: 14 }}>ריצות אחרונות</SectionTitle>
      {p.recentRuns.map((r, i) => (
        <View key={i} style={[styles.runRow, { borderRightColor: r.groupColor }]}>
          <View style={styles.runLeft}>
            <Text style={styles.runLogo}>{r.groupLogo}</Text>
            <View>
              <Text style={styles.runTitle}>{r.title}</Text>
              <Text style={styles.runGroup}>
                {r.groupName} · {r.date}
              </Text>
            </View>
          </View>
          <View style={styles.runRight}>
            <Text style={styles.runKm}>{r.km} ק״מ</Text>
            <Text style={styles.runPace}>{r.pace}/ק״מ</Text>
          </View>
        </View>
      ))}

      {/* Connect watch */}
      <TouchableOpacity
        style={styles.watchCard}
        onPress={() => Alert.alert('בקרוב!', 'חיבור שעון ריצה יגיע בגרסה הבאה')}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.watchTitle}>חבר שעון ריצה</Text>
          <Text style={styles.watchSub}>Garmin · Apple Watch · Polar · Coros</Text>
        </View>
        <View style={styles.watchBtn}>
          <Text style={styles.watchBtnText}>חבר ⌚</Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroName: { fontSize: 20, fontWeight: '900', color: COLORS.text.primary },
  heroCity: { fontSize: 12, color: COLORS.text.muted, marginBottom: 7 },
  heroBadges: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  watchBadge: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  watchBadgeText: { fontSize: 11, color: '#aaa' },
  streakBadge: { fontSize: 11, color: COLORS.yellow, fontWeight: '700' },
  ringEmoji: { position: 'absolute', fontSize: 22, top: 20, left: 22 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  goalLabel: { fontSize: 11, color: COLORS.text.secondary },
  goalValue: { fontSize: 11, color: COLORS.yellow },
  progBg: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 6, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: COLORS.yellow, borderRadius: 6 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 12,
  },
  chartTitle: { fontSize: 12, color: COLORS.text.secondary, fontWeight: '600', marginBottom: 10 },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barVal: { fontSize: 9, color: COLORS.text.muted },
  barDay: { fontSize: 9, color: COLORS.text.hint },
  followRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  followCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  followLogo: { fontSize: 24, marginBottom: 4 },
  followNameRow: { flexDirection: 'row', gap: 3, alignItems: 'center', marginBottom: 2 },
  followName: { fontSize: 11, fontWeight: '700', color: COLORS.text.primary },
  followCity: { fontSize: 11, color: COLORS.text.muted },
  addFollowCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFollowPlus: { fontSize: 22, color: COLORS.text.hint },
  runRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingRight: 13,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 11,
    marginBottom: 7,
    borderRightWidth: 3,
  },
  runLeft: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  runLogo: { fontSize: 18 },
  runTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary },
  runGroup: { fontSize: 11, color: COLORS.text.muted },
  runRight: { flexDirection: 'row', gap: 12 },
  runKm: { fontSize: 12, color: '#aaa' },
  runPace: { fontSize: 12, color: COLORS.yellow },
  watchCard: {
    marginTop: 14,
    backgroundColor: 'rgba(56,232,198,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(56,232,198,0.2)',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watchTitle: { fontSize: 13, fontWeight: '700', color: COLORS.teal, marginBottom: 2 },
  watchSub: { fontSize: 11, color: COLORS.text.muted },
  watchBtn: { backgroundColor: COLORS.teal, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
  watchBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
});
