# RunTogether 🏃

אפליקציית ריצה קבוצתית — גלה אימונים, הצטרף לקבוצות, קנה וממכור ציוד.

## מבנה הפרויקט

```
RunTogether/
├── app/                        # expo-router pages
│   ├── _layout.tsx             # Root layout + providers
│   ├── notifications.tsx       # Notifications modal
│   └── (tabs)/
│       ├── _layout.tsx         # Tab bar + header
│       ├── index.tsx           # גלה אימונים
│       ├── myworkouts.tsx      # האימונים שלי
│       ├── groups.tsx          # קבוצות
│       ├── market.tsx          # מרקטפלייס
│       └── profile.tsx         # פרופיל
├── src/
│   ├── constants/
│   │   ├── index.ts            # Colors, cities, etc.
│   │   └── types.ts            # TypeScript interfaces
│   ├── data/
│   │   └── mockData.ts         # All seed data
│   ├── hooks/
│   │   └── useAppStore.tsx     # Global state (Context + useReducer)
│   ├── components/
│   │   ├── UI.tsx              # Shared components
│   │   ├── WorkoutCard.tsx     # Workout card
│   │   ├── BottomSheet.tsx     # Animated bottom sheet modal
│   │   └── FormFields.tsx      # Form inputs
│   └── screens/
│       ├── DiscoverScreen.tsx
│       ├── MyWorkoutsScreen.tsx
│       ├── GroupsScreen.tsx
│       ├── MarketScreen.tsx
│       ├── ProfileScreen.tsx
│       └── NotificationsScreen.tsx
└── assets/                     # Icons, splash (add your own)
```

## התחלה מהירה

### דרישות מוקדמות
- Node.js 18+
- npm / yarn
- אפליקציית Expo Go בטלפון

### הרצה

```bash
# 1. התקן dependencies
npm install

# 2. הפעל
npm start

# 3. סרוק QR code עם Expo Go
```

### הרצה על סימולטור

```bash
# iOS (דורש Mac + Xcode)
npm run ios

# Android (דורש Android Studio)
npm run android
```

## השלבים הבאים

### Backend (Supabase — מומלץ)
1. צור פרויקט ב-[supabase.com](https://supabase.com)
2. הוסף טבלאות: `workouts`, `groups`, `listings`, `users`
3. החלף את `src/data/mockData.ts` בקריאות API

```bash
npm install @supabase/supabase-js
```

### Authentication
```bash
npx expo install expo-auth-session expo-crypto
```

### Push Notifications
```bash
npx expo install expo-notifications
```

### Map Integration
```bash
npx expo install react-native-maps
```

## Build לחנות

### EAS Build (הדרך המומלצת)

```bash
# התקן EAS CLI
npm install -g eas-cli

# התחבר
eas login

# הגדר
eas build:configure

# Build ל-iOS
eas build --platform ios

# Build ל-Android
eas build --platform android
```

### שינוי Bundle ID
ב-`app.json`:
- iOS: `"bundleIdentifier": "com.youname.runtogether"`
- Android: `"package": "com.yourname.runtogether"`

## טכנולוגיות
- **Expo SDK 51** + **Expo Router 3**
- **React Native 0.74**
- **TypeScript**
- **React Context + useReducer** (state management)
