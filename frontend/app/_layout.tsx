import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { storage } from "@/src/utils/storage";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/AuthContext";
import { registerForPush } from "@/src/push";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Push: foreground display behavior — MODULE SCOPE (web-guarded).
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Push: Android channel — MODULE SCOPE.
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  // Register for push whenever a user session becomes active.
  useEffect(() => {
    if (user) registerForPush(user.id);
  }, [user]);

  // Push tap handling + denied-permission nudge.
  useEffect(() => {
    if (Platform.OS === "web") return;

    const openFromData = (data: any) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      url.startsWith("http") ? Linking.openURL(url) : router.push(url);
    };

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromData(response.notification.request.content.data || {});
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromData(response.notification.request.content.data || {});
    });

    (async () => {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== "denied" || canAskAgain) return;
      const lastNudge = await storage.getItem<number>("pushNudgeAt", 0);
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (lastNudge && Date.now() - Number(lastNudge) <= oneWeek) return;
      await storage.setItem("pushNudgeAt", Date.now());
      Linking.openSettings();
    })();

    return () => {
      tapSub.remove();
    };
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group/create" options={{ presentation: "modal" }} />
      <Stack.Screen name="group/members/[id]" />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="workout/create" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/log" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    "BarlowCondensed-Bold": require("../assets/fonts/BarlowCondensed-Bold.ttf"),
    "BarlowCondensed-SemiBold": require("../assets/fonts/BarlowCondensed-SemiBold.ttf"),
    "BarlowCondensed-Medium": require("../assets/fonts/BarlowCondensed-Medium.ttf"),
    "BarlowCondensed-Regular": require("../assets/fonts/BarlowCondensed-Regular.ttf"),
    "IBMPlexSans-Regular": require("../assets/fonts/IBMPlexSans-Regular.ttf"),
    "IBMPlexSans-Medium": require("../assets/fonts/IBMPlexSans-Medium.ttf"),
    "IBMPlexSans-SemiBold": require("../assets/fonts/IBMPlexSans-SemiBold.ttf"),
    "IBMPlexSans-Bold": require("../assets/fonts/IBMPlexSans-Bold.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <View style={{ flex: 1, backgroundColor: colors.surface }}>
            <StatusBar style="light" />
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </View>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
