import React from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, fonts, font, spacing } from "@/src/theme";

const MAP_BG =
  "https://images.unsplash.com/photo-1544411047-c491e34a24e0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxkYXJrJTIwdmVjdG9yJTIwbWFwJTIwY2l0eXxlbnwwfHx8fDE3ODc0ODQ3MjZ8MA&ixlib=rb-4.1.0&q=85";

type Props = {
  latitude: number;
  longitude: number;
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  height?: number;
  fullBleed?: boolean;
};

// Web fallback: react-native-maps is native-only. We render a dark map image
// with a centered pin so the preview stays functional.
export default function LocationMap({ pickable, height = 220, fullBleed }: Props) {
  return (
    <View
      testID="location-map"
      style={[
        styles.wrap,
        fullBleed ? styles.full : { height, borderRadius: radius.md },
      ]}
    >
      <Image source={{ uri: MAP_BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.center}>
        <Ionicons name="location" size={40} color={colors.brand} />
      </View>
      {pickable && (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={14} color={colors.onSurfaceTertiary} />
          <Text style={styles.hintText}>Pin-drop available on device</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  full: { ...StyleSheet.absoluteFillObject },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  hint: {
    position: "absolute",
    bottom: spacing.sm,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  hintText: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
});
