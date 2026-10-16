// The animated mark on the web, through the canvas runtime. Same props as
// RiveLogo.jsx.

import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { Asset } from "expo-asset";
import { Alignment, EventType, Fit, Layout, Rive } from "@rive-app/canvas";
import "./runtime";
import { RIVE_FILES } from "./files";

export default function RiveLogo({ size = 150, artboard = size >= 96 ? "Logo" : "Small", onLanded, style }) {
  const canvas = useRef(null);
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    const rive = new Rive({
      src: Asset.fromModule(RIVE_FILES.logo).uri,
      canvas: canvas.current,
      artboard,
      stateMachines: artboard,
      autoplay: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => rive.resizeDrawingSurfaceToCanvas(),
    });
    rive.on(EventType.RiveEvent, (event) => {
      if (event.data?.name === "landed") landed.current?.();
    });
    return () => rive.cleanup();
  }, [artboard]);

  const spare = size * 0.1;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <canvas ref={canvas} style={{ position: "absolute", left: -spare, top: -spare, width: size + spare * 2, height: size + spare * 2 }} />
    </View>
  );
}
