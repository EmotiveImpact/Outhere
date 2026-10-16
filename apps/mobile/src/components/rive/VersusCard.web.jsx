// The 1v1 card on the web, through the canvas runtime (@rive-app/canvas).
// Same props as VersusCard.jsx.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Asset } from "expo-asset";
import { Alignment, EventType, Fit, Layout, Rive, decodeImage } from "@rive-app/canvas";
import "./runtime";
import { RIVE_FILES } from "./files";
import { imageUrl } from "./images";

const IMAGE_PROPS = ["youPhoto", "themPhoto"];

function bindValues(vmi, card, withIntro) {
  if (!vmi || !card) return;
  const set = (prop, value) => {
    if (prop) prop.value = value;
  };
  if (withIntro) set(vmi.enum("intro"), card.intro);
  for (const [key, value] of Object.entries(card.strings || {})) set(vmi.string(key), String(value ?? ""));
  for (const [key, value] of Object.entries(card.numbers || {})) set(vmi.number(key), Number(value) || 0);
  for (const [key, value] of Object.entries(card.booleans || {})) set(vmi.boolean(key), !!value);
}

async function bindImage(vmi, key, source) {
  const url = await imageUrl(source);
  if (!url) return;
  const response = await fetch(url);
  const image = await decodeImage(new Uint8Array(await response.arrayBuffer()));
  const prop = vmi.image(key);
  if (prop) prop.value = image;
  image.unref?.();
}

export default function VersusCard({ card, result, onCue, onReady, style }) {
  const canvas = useRef(null);
  const first = useRef(card);
  const [vmi, setVmi] = useState(null);
  const cue = useRef(onCue);
  cue.current = onCue;
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    const rive = new Rive({
      src: Asset.fromModule(RIVE_FILES.versus).uri,
      canvas: canvas.current,
      artboard: "Versus",
      stateMachines: "Versus",
      autoplay: false,
      autoBind: true,
      layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
      onLoad: () => {
        rive.resizeDrawingSurfaceToCanvas();
        const instance = rive.viewModelInstance;
        bindValues(instance, first.current, true);
        // replay sends the state machine to the intro just set, whether or
        // not it has already taken its first step.
        instance?.trigger("replay")?.trigger();
        rive.play();
        setVmi(instance);
        ready.current?.();
      },
    });
    rive.on(EventType.RiveEvent, (event) => cue.current?.(event.data?.name));
    const resize = () => rive.resizeDrawingSurfaceToCanvas();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      rive.cleanup();
    };
  }, []);

  useEffect(() => {
    bindValues(vmi, card, false);
  }, [vmi, card]);

  const youPhoto = card?.photos?.youPhoto;
  const themPhoto = card?.photos?.themPhoto;
  useEffect(() => {
    if (!vmi) return;
    [youPhoto, themPhoto].forEach((source, i) => {
      if (source != null) bindImage(vmi, IMAGE_PROPS[i], source).catch(() => {});
    });
  }, [vmi, youPhoto, themPhoto]);

  const played = useRef(false);
  useEffect(() => {
    if (!vmi || !result || played.current) return;
    played.current = true;
    (async () => {
      const ko = vmi.boolean("ko");
      if (ko) ko.value = !!result.ko;
      const prize = vmi.string("prize");
      if (prize && result.prize) prize.value = result.prize;
      await Promise.all([
        bindImage(vmi, "youResult", result.youResult ?? youPhoto).catch(() => {}),
        bindImage(vmi, "themResult", result.themResult ?? themPhoto).catch(() => {}),
      ]);
      vmi.trigger(result.outcome === "win" ? "win" : "lose")?.trigger();
    })();
  }, [vmi, result, youPhoto, themPhoto]);

  return (
    <View style={[styles.card, style]}>
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: "#04060b" },
});
