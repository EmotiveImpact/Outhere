// The 1v1 card (rive/versus) on a phone, through @rive-app/react-native.
// Only render it when riveAvailable is true (runtime.js); Expo Go can't.
//
//   card     versusCard(...) from versusData.js: intro, strings, numbers,
//            booleans and the two photos. The intro is read once, as the card
//            first plays; everything else follows the prop.
//   result   versusResult(...) or null. When it arrives the card loads the
//            result shots and plays the win or the loss, once.
//   onCue    called with each event the file fires (slam, youWin, prize,
//            addPack, ...; the list is in rive/versus/README.md).
//   onReady  called once the card is on screen and playing.

import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { riveNative as R } from "./runtime";
import { RIVE_FILES } from "./files";
import { imageUrl } from "./images";

const IMAGE_PROPS = ["youPhoto", "themPhoto"];

function bindValues(vmi, card, withIntro) {
  if (!vmi || !card) return;
  if (withIntro) vmi.enumProperty("intro")?.set(card.intro);
  for (const [key, value] of Object.entries(card.strings || {})) vmi.stringProperty(key)?.set(String(value ?? ""));
  for (const [key, value] of Object.entries(card.numbers || {})) vmi.numberProperty(key)?.set(Number(value) || 0);
  for (const [key, value] of Object.entries(card.booleans || {})) vmi.booleanProperty(key)?.set(!!value);
}

async function bindImage(vmi, key, source) {
  const url = await imageUrl(source);
  if (!url) return;
  const image = await R.RiveImages.loadFromURLAsync(url);
  vmi.imageProperty(key)?.set(image);
}

export default function VersusCard({ card, result, onCue, onReady, style }) {
  const { riveFile } = R.useRiveFile(RIVE_FILES.versus);
  const first = useRef(card);
  // The intro and the first values are set before the card binds, so the
  // state machine opens on the right intro.
  const { instance } = R.useViewModelInstance(riveFile, { viewModelName: "Versus", onInit: (vmi) => bindValues(vmi, first.current, true) });
  const { riveViewRef, setHybridRef } = R.useRive();
  const cue = useRef(onCue);
  cue.current = onCue;
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    bindValues(instance, card, false);
  }, [instance, card]);

  const youPhoto = card?.photos?.youPhoto;
  const themPhoto = card?.photos?.themPhoto;
  useEffect(() => {
    if (!instance) return;
    [youPhoto, themPhoto].forEach((source, i) => {
      if (source != null) bindImage(instance, IMAGE_PROPS[i], source).catch(() => {});
    });
  }, [instance, youPhoto, themPhoto]);

  useEffect(() => {
    if (!riveViewRef) return undefined;
    riveViewRef.onEventListener((event) => cue.current?.(event.name));
    ready.current?.();
    return () => riveViewRef.removeEventListeners();
  }, [riveViewRef]);

  // The result plays once: the shots load first so they're there under the flash.
  const played = useRef(false);
  useEffect(() => {
    if (!instance || !riveViewRef || !result || played.current) return;
    played.current = true;
    (async () => {
      instance.booleanProperty("ko")?.set(!!result.ko);
      if (result.prize) instance.stringProperty("prize")?.set(result.prize);
      await Promise.all([
        bindImage(instance, "youResult", result.youResult ?? youPhoto).catch(() => {}),
        bindImage(instance, "themResult", result.themResult ?? themPhoto).catch(() => {}),
      ]);
      instance.triggerProperty(result.outcome === "win" ? "win" : "lose")?.trigger();
      riveViewRef.playIfNeeded();
    })();
  }, [instance, riveViewRef, result, youPhoto, themPhoto]);

  return (
    <View style={[styles.card, style]}>
      {riveFile && instance ? (
        <R.RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName="Versus"
          stateMachineName="Versus"
          dataBind={instance}
          autoPlay
          fit={R.Fit.Cover}
          alignment={R.Alignment.Center}
          onError={(error) => console.warn("VS card:", error.message)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: "#04060b" },
});
