import React from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  TextInput,
  TextInputProps,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fonts, font } from "@/src/theme";

// ------------------------------------------------------------------ Button
type BtnProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  style,
}: BtnProps) {
  const isDisabled = disabled || loading;
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.surfaceTertiary,
    outline: "transparent",
    danger: colors.error,
    success: colors.success,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onSurface,
    outline: colors.onSurface,
    danger: colors.onError,
    success: colors.onSuccess,
  }[variant];
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (isDisabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && styles.btnOutline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------ TextField
type FieldProps = TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap };
export function TextField({ label, icon, style, ...rest }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        {icon && <Ionicons name={icon} size={18} color={colors.onSurfaceTertiary} />}
        <TextInput
          placeholderTextColor={colors.onSurfaceTertiary}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ Chip
export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={styles.chipRowOuter}
    >
      {children}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ Avatar
export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceTertiary }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Badge
export function Badge({ label, color = colors.brandPrimary, textColor }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor || colors.onBrandPrimary }]}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Empty / Error state
export function StateView({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={40} color={colors.brand} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle && <Text style={styles.stateSub}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.lg }}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnOutline: { borderWidth: 1.5, borderColor: colors.borderStrong },
  btnRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnText: { fontFamily: fonts.bodySemi, fontSize: font.lg },

  fieldWrap: { gap: spacing.xs },
  label: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: { flex: 1, color: colors.onSurface, fontFamily: fonts.body, fontSize: font.lg, paddingVertical: spacing.md },

  chipRowOuter: { flexGrow: 0 },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: {
    height: 36,
    flexShrink: 0,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipIdle: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: font.base },
  chipTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.bodySemi },

  avatarFallback: { backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.brand, fontFamily: fonts.bodyBold },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },

  state: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl, gap: spacing.sm },
  stateIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  stateTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: font.xl, textAlign: "center" },
  stateSub: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.base, textAlign: "center" },
});
