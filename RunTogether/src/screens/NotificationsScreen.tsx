import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants';
import { useAppStore } from '../hooks/useAppStore';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();

  React.useEffect(() => {
    dispatch({ type: 'MARK_NOTIFS_READ' });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>התראות</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={state.notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item: n }) => (
          <View style={[styles.row, n.unread && styles.rowUnread]}>
            <Text style={styles.icon}>{n.icon}</Text>
            <View style={styles.textCol}>
              <Text style={styles.notifText}>{n.text}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
            {n.unread && <View style={styles.dot} />}
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { fontSize: 22, color: COLORS.text.primary },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowUnread: { backgroundColor: 'rgba(255,255,255,0.025)' },
  icon: { fontSize: 20 },
  textCol: { flex: 1 },
  notifText: { fontSize: 13, color: COLORS.text.primary, lineHeight: 19 },
  time: { fontSize: 11, color: COLORS.text.muted, marginTop: 3 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
});
