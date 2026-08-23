import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/src/theme";

export default function Index() {
  // RootNavigator (in _layout) redirects based on auth state.
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
