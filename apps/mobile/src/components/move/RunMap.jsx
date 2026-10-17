// Native map for Move (react-native-maps, works in Expo Go). Apple Maps in
// dark mode on iOS, Google with a dark style on Android. Draws the recorded
// track, a planned or followed route, numbered points while drawing, people
// out now (club mates as faces, everyone else as dots) and the way back when
// you're off route. camera: "map" | "pilot" (tilted, heading up) | "street".

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Image } from "expo-image";
import { C, F, imageSource } from "@/components/ui";
import { DARK_MAP_STYLE, DEFAULT_REGION, isCoord, regionFor } from "./geo";
import { MapShade } from "./MapTexture";

const EDGE = { top: 120, right: 60, bottom: 320, left: 60 };
const CAMERA = { map: { zoom: 15.2, pitch: 0 }, pilot: { zoom: 17.6, pitch: 60 }, street: { zoom: 18.6, pitch: 0 } };

function Face({ person, size = 40, colour = C.accentHi }) {
  const [track, setTrack] = useState(true);
  return (
    <Marker coordinate={person} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track}>
      <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, borderColor: colour }]}>
        <Image source={imageSource(person.avatar)} style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }} onLoad={() => setTimeout(() => setTrack(false), 200)} onError={() => setTrack(false)} />
      </View>
    </Marker>
  );
}

const RunMap = forwardRef(function RunMap(
  {
    userLocation,
    follow = false,
    camera = "map",
    heading = 0,
    segments = [],
    trackColour = C.accent,
    plannedPath = [],
    plannedStyle = "dots",
    waypoints = [],
    routes = [],
    people = [],
    dots = [],
    trails = [],
    rejoin = null,
    userTone = null,
    onPress,
    onUserPan,
    fitTo,
    padding = EDGE,
    interactive = true,
    showsUser = true,
    shade = true,
    style,
  },
  ref,
) {
  const mapRef = useRef(null);
  const ready = useRef(false);

  const fit = (coords) => {
    const valid = (coords || []).filter(isCoord);
    if (!mapRef.current || !valid.length) return;
    if (valid.length === 1) mapRef.current.animateToRegion({ ...valid[0], latitudeDelta: 0.008, longitudeDelta: 0.008 }, 400);
    else mapRef.current.fitToCoordinates(valid, { edgePadding: padding, animated: true });
  };

  useImperativeHandle(ref, () => ({
    recenter: (coord) => isCoord(coord) && mapRef.current?.animateCamera({ center: coord, ...CAMERA[camera], heading: camera === "map" ? 0 : heading }, { duration: 500 }),
    fit,
  }));

  // Follow the runner, tilted and heading up in pilot.
  useEffect(() => {
    if (!follow || !isCoord(userLocation) || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: userLocation.latitude, longitude: userLocation.longitude }, ...(camera !== "map" ? { ...CAMERA[camera], heading: heading || 0 } : null) },
      { duration: 600 },
    );
  }, [follow, camera, heading, userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    if (camera === "map" && mapRef.current && isCoord(userLocation) && follow) mapRef.current.animateCamera({ ...CAMERA.map, heading: 0 }, { duration: 400 });
  }, [camera]);

  const onMapReady = () => {
    ready.current = true;
    if (fitTo?.length) setTimeout(() => fit(fitTo), 50);
  };
  // Refit only when the points change, not on every new array.
  const fitKey = fitTo?.length ? fitTo.map((p) => `${p.latitude?.toFixed?.(4)},${p.longitude?.toFixed?.(4)}`).join(";") : "";
  useEffect(() => {
    if (ready.current && fitTo?.length) fit(fitTo);
  }, [fitKey]);

  const initialRegion = fitTo?.length
    ? regionFor(fitTo)
    : isCoord(userLocation)
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
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
        showsUserLocation={showsUser && !userTone}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsPointsOfInterest={false}
        showsBuildings={camera === "pilot"}
        toolbarEnabled={false}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        onMapReady={onMapReady}
        onPress={onPress ? (e) => onPress(e.nativeEvent.coordinate) : undefined}
        onPanDrag={onUserPan}
      >
        {routes.map((r) =>
          r.path?.length > 1 ? (
            <Polyline key={`r-${r.key}`} coordinates={r.path} strokeColor={r.active ? C.accent : "rgba(93,127,184,0.38)"} strokeWidth={r.active ? 7 : 4} lineCap="round" lineJoin="round" zIndex={r.active ? 3 : 1} />
          ) : null,
        )}
        {trails.map((t, i) => (t.length > 1 ? <Polyline key={`t-${i}`} coordinates={t} strokeColor="rgba(130,180,255,0.7)" strokeWidth={4} lineCap="round" /> : null))}
        {plannedPath.length > 1 ? (
          <Polyline
            coordinates={plannedPath}
            strokeColor={plannedStyle === "faint" ? "rgba(130,180,255,0.45)" : C.accent}
            strokeWidth={plannedStyle === "dots" ? 6 : 7}
            lineDashPattern={plannedStyle === "dots" ? [1, 12] : undefined}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {/* path(): a wide soft glow under the track */}
        {segments.map((seg, i) => (seg.length > 1 ? <Polyline key={`glow-${i}`} coordinates={seg} strokeColor="rgba(61,139,255,0.22)" strokeWidth={18} lineCap="round" lineJoin="round" zIndex={3} /> : null))}
        {segments.map((seg, i) => (seg.length > 1 ? <Polyline key={`seg-${i}`} coordinates={seg} strokeColor={trackColour} strokeWidth={7} lineCap="round" lineJoin="round" zIndex={4} /> : null))}
        {rejoin && isCoord(rejoin.from) && isCoord(rejoin.to) ? (
          <Polyline coordinates={[rejoin.from, rejoin.to]} strokeColor={C.accentHi} strokeWidth={5} lineDashPattern={[1, 10]} lineCap="round" zIndex={5} />
        ) : null}
        {dots.map((d, i) => (
          <Marker key={`d-${i}`} coordinate={d} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.dot} />
          </Marker>
        ))}
        {waypoints.map((w, i) => (
          <Marker key={`wp-${i}`} coordinate={w} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[styles.waypoint, i === 0 && styles.waypointStart]}>{i > 0 ? <Text style={styles.wpText}>{i}</Text> : null}</View>
          </Marker>
        ))}
        {start ? (
          <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.startDot} />
          </Marker>
        ) : null}
        {people.map((p) => (
          <Face key={`p-${p.id}`} person={p} size={p.crew ? 44 : 34} />
        ))}
        {userTone && isCoord(userLocation) ? (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={9}>
            <View style={[styles.me, { borderColor: userTone === "danger" ? C.danger : userTone === "grey" ? "#6f7c92" : C.accent }]} />
          </Marker>
        ) : null}
      </MapView>
      {shade ? <MapShade /> : null}
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#111" },
  waypoint: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center" },
  waypointStart: { backgroundColor: C.bg, borderColor: C.accentHi, width: 22, height: 22 },
  wpText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  startDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg, borderWidth: 4, borderColor: C.accentHi },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.bg, borderWidth: 2.5, borderColor: "#5d7fb8" },
  face: { borderWidth: 3, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  me: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", borderWidth: 5 },
});
