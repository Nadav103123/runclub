import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius } from "@/src/theme";
import { Button, TextField } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";
import { ApiError } from "@/src/api";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as ApiError).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image
          source={{ uri: "https://images.pexels.com/photos/19146676/pexels-photo-19146676.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient colors={["rgba(16,17,21,0.2)", colors.surface]} style={StyleSheet.absoluteFill} />
        <View style={[styles.brandWrap, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.logoPill}>
            <Ionicons name="flash" size={20} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.brand}>STRIDE TRIBE</Text>
          <Text style={styles.tagline}>Find your pack. Run together.</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.form}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        bottomOffset={24}
      >
        <Text style={styles.heading}>Welcome back</Text>
        <TextField
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="login-email-input"
        />
        <TextField
          label="Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="login-password-input"
        />
        {error ? (
          <Text style={styles.error} testID="login-error">{error}</Text>
        ) : null}
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Sign In" onPress={submit} loading={loading} testID="login-submit-button" />
        </View>
        <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switch} testID="go-register">
          <Text style={styles.switchText}>
            New here? <Text style={styles.switchAccent}>Create an account</Text>
          </Text>
        </Pressable>
        <View style={styles.demoBox}>
          <Text style={styles.demoText}>Demo login: demo@stridetribe.com / Password123</Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
  brandWrap: { paddingHorizontal: spacing.lg, gap: spacing.xs, marginTop: spacing.md },
  logoPill: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  brand: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 40, letterSpacing: 1 },
  tagline: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.lg },
  form: { flex: 1 },
  heading: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 30, marginBottom: spacing.xs },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: font.base },
  switch: { alignItems: "center", paddingVertical: spacing.md },
  switchText: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.base },
  switchAccent: { color: colors.brand, fontFamily: fonts.bodySemi },
  demoBox: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  demoText: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm, textAlign: "center" },
});
