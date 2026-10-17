// The animated mark (rive/logo) on a phone. `size` is the mark's own box, as
// for Logo; the artboard has a tenth of the size spare on every side for the
// glow, so the player overhangs the box by that much. Logo (96 px and up)
// lands the dot with a ping and a glow that then breathes; Small (under
// that) plays the same landing without them. onLanded fires as the dot lands.
// Only render it when riveAvailable is true (runtime.js).

import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { listenForEvents, riveNative as R } from "./runtime";
import { RIVE_FILES } from "./files";

const LANDED_MS = 1100;

export default function RiveLogo({ size = 150, artboard = size >= 96 ? "Logo" : "Small", onLanded, style }) {
  const { riveFile } = R.useRiveFile(RIVE_FILES.logo);
  const { riveViewRef, setHybridRef } = R.useRive();
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    if (!riveViewRef) return undefined;
    const stop = listenForEvents(riveViewRef, (event) => {
      if (event.name === "landed") landed.current?.();
    });
    if (stop) return stop;
    // No events on this player: the dot lands about 1.1 s into the intro.
    const timer = setTimeout(() => landed.current?.(), LANDED_MS);
    return () => clearTimeout(timer);
  }, [riveViewRef]);

  const spare = size * 0.1;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      {riveFile ? (
        <R.RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={artboard}
          dataBind={R.DataBindMode.None}
          stateMachineName={artboard}
          autoPlay
          fit={R.Fit.Contain}
          onError={(error) => console.warn("Logo:", error.message)}
          style={{ position: "absolute", left: -spare, top: -spare, width: size + spare * 2, height: size + spare * 2 }}
        />
      ) : null}
    </View>
  );
}
