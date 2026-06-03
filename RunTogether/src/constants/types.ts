export interface Group {
  id: string;
  name: string;
  city: string;
  description: string;
  members: number;
  logo: string;
  color: string;
  verified: boolean;
  instagram?: string;
}

export interface Workout {
  id: string;
  groupId: string;
  groupName: string;
  city: string;
  title: string;
  date: string;
  time: string;
  location: string;
  distance: string;
  pace: string;
  level: string;
  spots: number;
  registered: string[];
  description?: string;
}

export interface Listing {
  id: string;
  userId: string;
  userName: string;
  city: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  description: string;
  emoji: string;
}

export interface Notification {
  id: string;
  icon: string;
  text: string;
  time: string;
  unread: boolean;
}

export interface UserProfile {
  name: string;
  city: string;
  watch: string;
  weeklyGoal: number;
  stats: {
    totalKm: number;
    totalRuns: number;
    bestPace: string;
    longestRun: number;
    currentStreak: number;
  };
  weeklyKm: number[];
  following: string[];
  recentRuns: RecentRun[];
}

export interface RecentRun {
  groupId?: string;
  groupName: string;
  groupLogo: string;
  groupColor: string;
  title: string;
  date: string;
  km: number;
  pace: string;
}
