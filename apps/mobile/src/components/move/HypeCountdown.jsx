// The countdown before every run (the prototype's mCount7, on the kit's
// Spotlight): 3, 2, 1, GO slam in with shock rings and warp rays, the colour
// heats up from 3 to 1 and GO floods the screen blue. Your map stays in the
// background, blurred and pushed in under a lighter veil than the city and
// borough countdowns, so you can see where you're about to go. Your route,
// the time to beat, the OUT on offer and your streak sit underneath. On GO
// the whole layer shrinks into your pin as the map comes back into focus
// (the parent eases the map back from 1.12). Start now skips the count.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { MotiView } from "moti";
import { ChevronLeft } from "@/components/ui/icons";
import { haptic } from "@/services/haptics";
import { HypeLinks, HypeStage } from "./HypeStage";
import { RoundGlass, TopBar } from "./parts";

const LINES = ["Laces tight", "Phone away", "Breathe", "Go get it"];
const NUMS = ["3", "2", "1", "GO"];

// The run's own veil: the .hype light, thinner, so the map reads through.
const RUN_VEIL = [{ x: 0.5, y: 0.44, rx: 0.62, ry: 0.42, stops: [[0, "rgba(14,40,96,0.06)"], [0.7, "rgba(3,5,10,0.34)"], [1, "rgba(3,5,10,0.55)"]] }];

export default function HypeCountdown({ routeLabel, kickers = [], stakes = [], onGo, onCancel, top = 22 }) {
  const [i, setI] = useState(0);
  const done = useRef(false);

  const go = () => {
    if (done.current) return;
    done.current = true;
    haptic.go();
    onGo?.();
  };

  useEffect(() => {
    if (i < 3) haptic.beat();
    const t = setTimeout(() => (i < 3 ? setI(i + 1) : go()), i < 3 ? 1000 : 650);
    return () => clearTimeout(t);
  }, [i]);

  const beats = NUMS.map((n, k) => ({ n, line: LINES[k], kicker: kickers[k] || "" }));

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.15 }}
      exitTransition={{ type: "timing", duration: 420 }}
      transition={{ type: "timing", duration: 180 }}
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
    >
      <HypeStage
        beat={i}
        beats={beats}
        chip={routeLabel}
        stakes={stakes}
        clear
        veil={RUN_VEIL}
        foot={
          <HypeLinks
            links={[
              { label: "Cancel", onPress: onCancel },
              { label: "Start now", onPress: go, blue: true },
            ]}
          />
        }
      />
      <TopBar top={top} left={<RoundGlass icon={ChevronLeft} label="Cancel" onPress={onCancel} />} />
    </MotiView>
  );
}
