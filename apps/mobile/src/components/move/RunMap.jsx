// Native map for the Move tab (react-native-maps, works in Expo Go).
// Apple Maps in dark mode on iOS, Google with a dark style on Android.

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { C } from "@/components/ui";
import { DARK_MAP_STYLE, DEFAULT_REGION, isCoord, regionFor } from "./geo";

const EDGE = { top: 80, right: 60, bottom: 80, left: 60 };

const RunMap = forwardRef(function RunMap(
  { userLocation, follow = false, segments = [], plannedPath = [], waypoints = [], onPress, onUserPan, fitTo, interactive = true, showsUser = true, style },
  ref,
) {
  const mapRef = useRef(null);
  const ready = useRef(false);

  const fit = (coords) => {
    const valid = (coords || []).filter(isCoord);
    if (!mapRef.current || !valid.length) return;
    if (valid.length === 1) mapRef.current.animateToRegion({ ...valid[0], latitudeDelta: 0.008, longitudeDelta: 0.008 }, 400);
    else mapRef.current.fitToCoordinates(valid, { edgePadding: EDGE, animated: true });
  };

  useImperativeHandle(ref, () => ({
    recenter: (coord) => isCoord(coord) && mapRef.current?.animateCamera({ center: coord, zoom: 16.5, pitch: 0, heading: 0 }, { duration: 500 }),
    fit,
  }));

  // Follow the runner.
  useEffect(() => {
    if (!follow || !isCoord(userLocation) || !mapRef.current) return;
    mapRef.current.animateCamera({ center: { latitude: userLocation.latitude, longitude: userLocation.longitude } }, { duration: 600 });
  }, [follow, userLocation?.latitude, userLocation?.longitude]);

  // Static previews: fit the route once the map is laid out.
  const onMapReady = () => {
    ready.current = true;
    if (fitTo?.length) setTimeout(() => fit(fitTo), 50);
  };
  useEffect(() => {
    if (ready.current && fitTo?.length) fit(fitTo);
  }, [fitTo]);

  const initialRegion = fitTo?.length
    ? regionFor(fitTo)
    : isCoord(userLocation)
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : DEFAULT_REGION;

  const start = segments.find((s) => s.length)?.[0];

  return (
    <View style={[styles.wrap, style]} pointerEvents={interactive ? "auto" : "none"}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation={showsUser}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={interactive}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        onMapReady={onMapReady}
        onPress={onPress ? (e) => onPress(e.nativeEvent.coordinate) : undefined}
        onPanDrag={onUserPan}
      >
        {plannedPath.length > 1 ? (
          <Polyline coordinates={plannedPath} strokeColor="rgba(255,255,255,0.55)" strokeWidth={5} lineDashPattern={[8, 8]} lineCap="round" lineJoin="round" />
        ) : null}
        {waypoints.map((w, i) => (
          <Marker key={`wp-${i}`} coordinate={w} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[styles.waypoint, i === 0 && styles.waypointStart]} />
          </Marker>
        ))}
        {segments.map((seg, i) =>
          seg.length > 1 ? (
            <Polyline key={`seg-${i}`} coordinates={seg} strokeColor={C.accent} strokeWidth={6} lineCap="round" lineJoin="round" />
          ) : null,
        )}
        {start ? (
          <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.startDot} />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#111" },
  waypoint: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.bg, borderWidth: 3, borderColor: "#fff" },
  waypointStart: { borderColor: C.accent },
  startDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg },
});
