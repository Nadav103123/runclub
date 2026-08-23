import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font } from "@/src/theme";
import { Button, TextField } from "@/src/components/ui";
import { useAuth } from "@/src/AuthContext";
import { ApiError } from "@/src/api";

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!name || !email || !password) {
      setError("Fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as ApiError).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="register-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
      </View>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        bottomOffset={24}
      >
        <Text style={styles.heading}>Join the tribe</Text>
        <Text style={styles.sub}>Create your runner profile in seconds.</Text>
        <TextField
          label="Full name"
          icon="person-outline"
          placeholder="Jordan Fields"
          value={name}
          onChangeText={setName}
          testID="register-name-input"
        />
        <TextField
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="register-email-input"
        />
        <TextField
          label="Password"
          icon="lock-closed-outline"
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="register-password-input"
        />
        {error ? <Text style={styles.error} testID="register-error">{error}</Text> : null}
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Create Account" onPress={submit} loading={loading} testID="register-submit-button" />
        </View>
        <Pressable onPress={() => router.back()} style={styles.switch} testID="go-login">
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heading: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 34 },
  sub: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.lg, marginBottom: spacing.sm },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: font.base },
  switch: { alignItems: "center", paddingVertical: spacing.md },
  switchText: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: font.base },
  switchAccent: { color: colors.brand, fontFamily: fonts.bodySemi },
});
