import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { colors, radius } from "@/src/theme";

type Props = {
  latitude: number;
  longitude: number;
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  height?: number;
  fullBleed?: boolean;
};

export default function LocationMap({
  latitude,
  longitude,
  pickable,
  onPick,
  height = 220,
  fullBleed,
}: Props) {
  return (
    <View
      testID="location-map"
      style={[
        styles.wrap,
        fullBleed ? styles.full : { height, borderRadius: radius.md },
      ]}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onPress={
          pickable
            ? (e) => {
                const { latitude: la, longitude: lo } = e.nativeEvent.coordinate;
                onPick?.(la, lo);
              }
            : undefined
        }
      >
        <Marker coordinate={{ latitude, longitude }} pinColor={colors.brand} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: colors.surfaceTertiary },
  full: { ...StyleSheet.absoluteFillObject },
});
