import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { storage } from "@/src/utils/storage";
import { TOKEN_KEY } from "@/src/api";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Register the device's native push token with the backend relay.
// No-op on web and safe to call on every app open (tokens rotate).
export async function registerForPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    const authToken = await storage.secureGet<string>(TOKEN_KEY, "");
    await fetch(`${BACKEND_URL}/api/register-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        user_id: userId,
        platform: Platform.OS,
        device_token: tokenResp.data,
      }),
    });
  } catch {
    // Push not available (e.g. Expo Go) — non-fatal.
  }
}
