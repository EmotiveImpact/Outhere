// Change your patch: the same picker as getting started. A city or town
// first, then an area in it.

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { engine, useEngineMutation, usePatchPlaces, useProfile } from "@/data/hooks";
import { Button, S, Skeleton, R, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { HeroPage } from "@/components/account/parts";
import PatchPicker from "@/components/account/PatchPicker";
import { roughPosition } from "@/services/locate";

export default function PatchSettings() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const all = usePatchPlaces("", null);
  const [place, setPlace] = useState(null);
  const [area, setArea] = useState(null);
  const [at, setAt] = useState(null);
  const [locating, setLocating] = useState(false);
  const [started, setStarted] = useState(false);

  // Start from the member's current place and area.
  useEffect(() => {
    if (started || !profile || !all.data) return;
    const mine = all.data.find((p) => p.id === profile.cityId) || all.data.find((p) => p.name === profile.city);
    if (mine) {
      setPlace(mine);
      if (profile.areaId) setArea({ id: profile.areaId, name: profile.area });
    }
    setStarted(true);
  }, [started, profile, all.data]);

  const save = useEngineMutation(engine.setPatch, {
    onSuccess: () => {
      toast.success(place && !place.isLive ? `You play for ${place.playsFor} for now` : `You play for ${area?.name || place?.name}`);
      router.back();
    },
  });

  const locate = async () => {
    setLocating(true);
    const p = await roughPosition({ ask: true });
    setLocating(false);
    if (p) setAt(p);
    else toast("No location", "Search for your city or town instead.");
  };

  const same = place && place.id === profile?.cityId && (area?.id || null) === (profile?.areaId || null);

  return (
    <HeroPage kicker="Your patch" top="Where do" bottom="you play?" height={200} object={PHOTOS.pin}>
      {!started ? (
        <Skeleton height={300} radius={R.lg} />
      ) : (
        <>
          <PatchPicker place={place} areaId={area?.id} onPlace={setPlace} onArea={setArea} at={at} locating={locating} onLocate={locate} />
          <View style={{ height: S.sm }} />
          <Button
            title={place ? `Play for ${area?.name || place.name}` : "Pick a place"}
            disabled={!place || same}
            loading={save.isPending}
            onPress={() => save.mutate({ cityId: place.id, areaId: area?.id || null })}
            full
          />
        </>
      )}
    </HeroPage>
  );
}
