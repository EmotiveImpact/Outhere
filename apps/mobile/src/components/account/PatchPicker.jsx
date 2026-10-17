// Your patch: first a city or town (nearest first when we know where you
// are, with a search box), then an area in it, shown as crest tiles with who
// is out there now and where it ranks this week. A place that isn't live yet
// plays for its region until it has 100 active members.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { MotiView } from "moti";
import { Check, ChevronsRight, LocateFixed, MapPin, Search } from "@/components/ui/icons";
import { usePatchAreas, usePatchPlaces } from "@/data/hooks";
import { C, F, PressableScale, R, S, Skeleton } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { formatNumber } from "@/utils/format";

export const areaWord = (place) => (place?.id === "london" ? "borough" : "area");

function SearchField({ value, onChange, placeholder }) {
  return (
    <View style={styles.search}>
      <Search size={18} color={C.textDim} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textDim}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={styles.searchInput}
      />
    </View>
  );
}

function PlaceRow({ place, onPress }) {
  const sub = place.isLive ? place.region : `Plays for ${place.playsFor} until 100 members`;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.placeRow} accessibilityLabel={place.name}>
      <View style={styles.placeIcon}>
        <MapPin size={17} color={place.isLive ? C.accentHi : C.textDim} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeSub} numberOfLines={1}>
          {place.kind === "town" ? "Town · " : ""}
          {sub}
        </Text>
      </View>
      {place.distanceKm != null ? <Text style={styles.placeKm}>{place.distanceKm < 1 ? "here" : `${formatNumber(place.distanceKm)} km`}</Text> : null}
      <ChevronsRight size={16} color={C.textDim} />
    </PressableScale>
  );
}

function AreaTile({ area, on, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={[styles.tile, on && styles.tileOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={area.name}>
      {on ? (
        <MotiView from={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} style={styles.tick}>
          <Check size={13} color="#fff" strokeWidth={3} />
        </MotiView>
      ) : null}
      <Text style={[styles.crest, on && { color: C.accent }]}>{area.short}</Text>
      <Text style={styles.tileName} numberOfLines={1}>
        {area.name}
      </Text>
      <View style={styles.tileMeta}>
        <View style={styles.dot} />
        <Text style={styles.tileSub} numberOfLines={1}>
          {area.outNow} out · #{area.rank} this week
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * place: the chosen place object (from listPatchPlaces) or null. onArea gets
 * the area object, or null when it is tapped again.
 * at: { lat, lng } when we know where the member is.
 */
export default function PatchPicker({ place, areaId, onPlace, onArea, at, locating, onLocate }) {
  const [placeQuery, setPlaceQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [all, setAll] = useState(false);
  const places = usePatchPlaces(placeQuery.trim(), at);
  const areas = usePatchAreas(place?.id);

  // With a location and nothing picked yet, start from the nearest place, once.
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || place || !at || placeQuery || !places.data?.length || places.data[0].distanceKm == null) return;
    autoPicked.current = true;
    onPlace(places.data[0]);
  }, [at, place, places.data, placeQuery, onPlace]);

  const shown = useMemo(() => {
    const list = areas.data || [];
    const q = areaQuery.trim().toLowerCase();
    if (q) return list.filter((a) => a.name.toLowerCase().includes(q));
    if (all) return list;
    const top = list.slice(0, 4);
    const mine = list.find((a) => a.id === areaId);
    return mine && !top.includes(mine) ? [...top.slice(0, 3), mine] : top;
  }, [areas.data, areaQuery, all, areaId]);

  if (!place) {
    return (
      <View style={{ gap: S.md }}>
        <SearchField value={placeQuery} onChange={setPlaceQuery} placeholder="Search cities and towns" />
        {!at ? (
          <PressableScale onPress={onLocate} disabled={locating} scaleTo={0.98} style={styles.locate}>
            {locating ? <ActivityIndicator size="small" color={C.accent} /> : <LocateFixed size={18} color={C.accent} />}
            <Text style={styles.locateText}>{locating ? "Finding you" : "Use my location"}</Text>
          </PressableScale>
        ) : null}
        <View style={styles.list}>
          {places.isPending ? (
            <View style={{ padding: S.lg, gap: S.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={36} radius={10} />
              ))}
            </View>
          ) : (places.data || []).length ? (
            (places.data || []).slice(0, 12).map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <View style={styles.sep} /> : null}
                <PlaceRow
                  place={p}
                  onPress={() => {
                    hapticSelection();
                    onPlace(p);
                  }}
                />
              </View>
            ))
          ) : (
            <Text style={[styles.placeSub, { padding: S.lg }]}>Nothing called that yet. Try the nearest town or city.</Text>
          )}
        </View>
      </View>
    );
  }

  const word = areaWord(place);
  return (
    <View style={{ gap: S.md }}>
      <View style={styles.chosen}>
        <MapPin size={16} color={C.accent} />
        <Text style={styles.chosenText} numberOfLines={1}>
          {place.name}
          {place.region && place.region !== place.name ? <Text style={{ color: C.textDim, fontFamily: F.body }}>{` · ${place.region}`}</Text> : null}
        </Text>
        <PressableScale
          onPress={() => {
            onPlace(null);
            onArea(null);
            setAreaQuery("");
          }}
          hitSlop={10}
          scaleTo={0.94}
        >
          <Text style={styles.change}>Change</Text>
        </PressableScale>
      </View>

      {!place.isLive ? (
        <View style={styles.region}>
          <Text style={styles.regionText}>
            {place.name} plays for {place.playsFor} until it has 100 active members. Your steps count for both.
          </Text>
        </View>
      ) : null}

      {areas.isPending ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={92} radius={18} style={{ width: "48.5%" }} />
          ))}
        </View>
      ) : (areas.data || []).length ? (
        <>
          <SearchField value={areaQuery} onChange={setAreaQuery} placeholder={`Search ${word === "borough" ? "boroughs" : "areas"}`} />
          <View style={styles.grid}>
            {shown.map((a) => (
              <View key={a.id} style={{ width: "48.5%" }}>
                <AreaTile
                  area={a}
                  on={a.id === areaId}
                  onPress={() => {
                    hapticSelection();
                    onArea(a.id === areaId ? null : a);
                  }}
                />
              </View>
            ))}
          </View>
          {!areaQuery && (areas.data || []).length > 4 ? (
            <PressableScale onPress={() => setAll((v) => !v)} hitSlop={8} scaleTo={0.96} style={{ alignSelf: "center" }}>
              <Text style={styles.change}>{all ? "Show the top four" : `See all ${(areas.data || []).length} ${word === "borough" ? "boroughs" : "areas"}`}</Text>
            </PressableScale>
          ) : null}
        </>
      ) : (
        <View style={styles.region}>
          <Text style={styles.regionText}>No {word}s in {place.name} yet. You play for {place.name} as a whole.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 50, borderRadius: R.lg, backgroundColor: C.surface, paddingHorizontal: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  searchInput: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15, outlineStyle: "none" },
  locate: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, paddingHorizontal: S.lg, borderRadius: R.full, alignSelf: "flex-start", backgroundColor: C.accentDim, borderWidth: 1, borderColor: "rgba(61,139,255,0.35)" },
  locateText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 14 },
  list: { borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 62 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: S.lg },
  placeIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  placeName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  placeSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  placeKm: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  chosen: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  chosenText: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  change: { color: C.accent, fontFamily: F.bodySemi, fontSize: 14 },
  region: { padding: S.lg, borderRadius: R.lg, backgroundColor: "#0f1726", borderWidth: 1, borderColor: "rgba(61,139,255,0.3)" },
  regionText: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  tile: { height: 92, borderRadius: 18, backgroundColor: C.surface, padding: 14, justifyContent: "flex-end", borderWidth: 1.5, borderColor: "transparent" },
  tileOn: { borderColor: C.accent, backgroundColor: "#13203a" },
  tick: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  crest: { color: C.textDim, fontFamily: F.display, fontSize: 24, lineHeight: 26, letterSpacing: 0.5 },
  tileName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: 2 },
  tileMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  tileSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, flexShrink: 1 },
});
