import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants';
import { useAppStore } from '../../src/hooks/useAppStore';

const TABS = [
  { name: 'index', icon: '🔍', label: 'גלה', dot: COLORS.yellow },
  { name: 'myworkouts', icon: '📅', label: 'שלי', dot: COLORS.yellow },
  { name: 'groups', icon: '👥', label: 'קבוצות', dot: COLORS.orange },
  { name: 'market', icon: '🛒', label: 'מרקט', dot: COLORS.teal },
  { name: 'profile', icon: '👤', label: 'פרופיל', dot: COLORS.purple },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab, i) => {
        const active = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tabBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.45 }]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, { color: active ? tab.dot : '#888', opacity: active ? 1 : 0.45 }]}>
              {tab.label}
            </Text>
            {active && <View style={[styles.tabDot, { backgroundColor: tab.dot }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HeaderRight() {
  const { state } = useAppStore();
  const router = useRouter();
  const hasUnread = state.notifications.some((n) => n.unread);
  return (
    <TouchableOpacity onPress={() => router.push('/notifications')} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 22 }}>🔔</Text>
      {hasUnread && <View style={styles.notifDot} />}
    </TouchableOpacity>
  );
}

function Logo() {
  return (
    <Text style={styles.logo}>
      <Text style={{ color: '#fff' }}>RUN</Text>
      <Text style={{ color: COLORS.yellow }}>TOGETHER</Text>
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerTitle: () => <Logo />,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'גלה אימונים' }} />
      <Tabs.Screen name="myworkouts" options={{ title: 'האימונים שלי' }} />
      <Tabs.Screen name="groups" options={{ title: 'קבוצות' }} />
      <Tabs.Screen name="market" options={{ title: 'מרקטפלייס' }} />
      <Tabs.Screen name="profile" options={{ title: 'הפרופיל שלי' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0e0e0e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    paddingTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: -1 },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: '#0e0e0e',
  },
  logo: { fontSize: 17, fontWeight: '900', letterSpacing: -1 },
});
