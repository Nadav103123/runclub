import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fonts, font, radius, CATEGORIES, DAYS } from "@/src/theme";
import { Button, TextField, Chip } from "@/src/components/ui";
import { api, uploadImage, resolveImage } from "@/src/api";
import { Group } from "@/src/types";

export default function CreateGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Road");
  const [isPrivate, setIsPrivate] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (d: string) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      setError("Photo access is needed to add a cover image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(result.assets[0].uri);
      setImageUrl(url);
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!name || !city) {
      setError("Group name and city are required.");
      return;
    }
    setSaving(true);
    try {
      const g = await api.post<Group>("/groups", {
        name,
        description,
        city,
        category,
        is_private: isPrivate,
        image_url: imageUrl,
        meeting_days: days,
      });
      router.replace(`/group/${g.id}`);
    } catch {
      setError("Could not create group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.close} testID="create-group-close">
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New Group</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.md }}
        bottomOffset={24}
      >
        <Pressable onPress={pickCover} style={styles.cover} testID="group-cover-picker">
          {imageUrl ? (
            <Image source={{ uri: resolveImage(imageUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <View style={styles.coverOverlay}>
            <Ionicons name={uploading ? "hourglass-outline" : "image-outline"} size={28} color={colors.onSurface} />
            <Text style={styles.coverText}>{uploading ? "Uploading..." : imageUrl ? "Change cover" : "Add cover image"}</Text>
          </View>
        </Pressable>

        <TextField label="Group name" value={name} onChangeText={setName} placeholder="Dawn Patrol Runners" testID="group-name-input" />
        <TextField label="City" icon="location-outline" value={city} onChangeText={setCity} placeholder="San Francisco" testID="group-city-input" />
        <TextField label="Description" value={description} onChangeText={setDescription} placeholder="What's your group about?" multiline testID="group-desc-input" />

        <Text style={styles.label}>Category</Text>
        <View style={styles.wrapRow}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} testID={`group-cat-${c}`} />
          ))}
        </View>

        <Text style={styles.label}>Meeting days</Text>
        <View style={styles.wrapRow}>
          {DAYS.map((d) => (
            <Chip key={d} label={d} active={days.includes(d)} onPress={() => toggleDay(d)} testID={`group-day-${d}`} />
          ))}
        </View>

        <View style={styles.privateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.privateTitle}>Private group</Text>
            <Text style={styles.privateSub}>Members must request approval to join</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ true: colors.brand, false: colors.surfaceTertiary }}
            thumbColor={colors.onSurface}
            testID="group-private-switch"
          />
        </View>

        {error ? <Text style={styles.error} testID="create-group-error">{error}</Text> : null}

        <View style={{ marginTop: spacing.sm }}>
          <Button title="Create Group" onPress={submit} loading={saving} testID="submit-group-button" />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.onSurface, fontFamily: fonts.displaySemi, fontSize: font.xl },
  cover: { height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  coverOverlay: { alignItems: "center", gap: spacing.xs, backgroundColor: "rgba(16,17,21,0.4)", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  coverText: { color: colors.onSurface, fontFamily: fonts.bodyMedium, fontSize: font.base },
  label: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: font.sm, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.xs },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  privateRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  privateTitle: { color: colors.onSurface, fontFamily: fonts.bodySemi, fontSize: font.lg },
  privateSub: { color: colors.onSurfaceTertiary, fontFamily: fonts.body, fontSize: font.sm },
  error: { color: colors.error, fontFamily: fonts.bodyMedium, fontSize: font.base },
});
