import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Workout, Group } from '../constants/types';
import { COLORS } from '../constants';
import { LevelBadge, VerifiedBadge } from './UI';
import { useAppStore } from '../hooks/useAppStore';
import { MY_USER_ID } from '../constants';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

interface WorkoutCardProps {
  workout: Workout;
  groups: Group[];
}

export default function WorkoutCard({ workout, groups }: WorkoutCardProps) {
  const { dispatch } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  const group = groups.find((g) => g.id === workout.groupId);
  const isRegistered = workout.registered.includes(MY_USER_ID);
  const spotsLeft = workout.spots - workout.registered.length;
  const isFull = spotsLeft <= 0;

  const handleRegister = () => {
    if (isRegistered) {
      dispatch({ type: 'UNREGISTER', workoutId: workout.id });
    } else if (!isFull) {
      dispatch({ type: 'REGISTER', workoutId: workout.id });
    }
  };

  return (
    <View style={[styles.card, isRegistered && styles.cardRegistered]}>
      <View style={styles.body}>
        <View style={styles.row}>
          {/* Left: info */}
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{workout.title}</Text>
              <LevelBadge level={workout.level} />
            </View>
            <View style={styles.groupRow}>
              <Text style={styles.groupName}>{workout.groupName}</Text>
              {group?.verified && <VerifiedBadge size={11} />}
              <Text style={styles.cityDot}>· {workout.city}</Text>
            </View>
            <Text style={styles.meta}>
              📅 {formatDate(workout.date)} · {workout.time}
            </Text>
            <Text style={styles.meta}>📌 {workout.location}</Text>
            <Text style={styles.meta}>
              🏃 {workout.distance} · {workout.pace}
            </Text>
          </View>

          {/* Right: spots + button */}
          <View style={styles.regCol}>
            <View style={styles.spotsRow}>
              {isFull ? (
                <Text style={styles.full}>אזל</Text>
              ) : (
                <>
                  <Text style={styles.spotsNum}>{spotsLeft}</Text>
                  <Text style={styles.spotsLabel}> פנויים</Text>
                </>
              )}
            </View>
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isFull && !isRegistered}
              style={[
                styles.regBtn,
                isRegistered
                  ? styles.regBtnActive
                  : isFull
                  ? styles.regBtnFull
                  : styles.regBtnDefault,
              ]}
            >
              <Text
                style={[
                  styles.regBtnText,
                  isRegistered
                    ? styles.regBtnTextActive
                    : isFull
                    ? styles.regBtnTextFull
                    : styles.regBtnTextDefault,
                ]}
              >
                {isRegistered ? '✓ נרשמת' : isFull ? 'מלא' : 'הרשמה'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {workout.description && (
          <TouchableOpacity
            onPress={() => setExpanded((e) => !e)}
            style={styles.expandBtn}
          >
            <Text style={styles.expandText}>
              {expanded ? '▲ הסתר' : '▼ 📋 מה אומר המאמן?'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {expanded && workout.description && (
        <View style={styles.descBox}>
          <View style={styles.descInner}>
            <View
              style={[
                styles.groupAvatar,
                { backgroundColor: (group?.color || '#888') + '33' },
              ]}
            >
              <Text style={{ fontSize: 13 }}>{group?.logo}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Text style={[styles.descGroupName, { color: group?.color || '#aaa' }]}>
                  {workout.groupName}
                </Text>
                {group?.verified && <VerifiedBadge size={10} />}
              </View>
              <Text style={styles.descText}>{workout.description}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 9,
    overflow: 'hidden',
    borderRightWidth: 3,
    borderRightColor: 'transparent',
  },
  cardRegistered: {
    borderRightColor: COLORS.yellow,
  },
  body: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.text.primary,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  groupName: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  cityDot: {
    fontSize: 11,
    color: COLORS.text.hint,
  },
  meta: {
    fontSize: 11,
    color: COLORS.text.muted,
    lineHeight: 18,
  },
  regCol: {
    alignItems: 'center',
    minWidth: 72,
  },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  spotsNum: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.yellow,
  },
  spotsLabel: {
    fontSize: 10,
    color: COLORS.text.hint,
  },
  full: {
    fontSize: 11,
    color: COLORS.red,
    fontWeight: '700',
  },
  regBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  regBtnDefault: {
    backgroundColor: COLORS.yellow,
  },
  regBtnActive: {
    backgroundColor: 'rgba(232,255,71,0.1)',
    borderWidth: 1,
    borderColor: COLORS.yellow,
  },
  regBtnFull: {
    backgroundColor: COLORS.surface,
  },
  regBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  regBtnTextDefault: { color: '#000' },
  regBtnTextActive: { color: COLORS.yellow },
  regBtnTextFull: { color: COLORS.text.hint },
  expandBtn: {
    marginTop: 9,
    paddingTop: 2,
  },
  expandText: {
    fontSize: 11,
    color: COLORS.text.muted,
  },
  descBox: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  descInner: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
  },
  groupAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descGroupName: {
    fontSize: 11,
    fontWeight: '700',
  },
  descText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 22,
  },
});
