// Small pieces shared by the profile, membership and rewards screens.

import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { Avatar, C, F } from "@/components/ui";

// Preset illustrated avatars. Stored on the profile as a plain image URL so
// every other screen can show them with <Avatar uri>. Coloured initials always
// sit underneath, so they still look right with no signal.
const dice = (style, seed) => `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256`;
export const PRESET_AVATARS = [
  dice("glass", "outhere-1"),
  dice("glass", "outhere-7"),
  dice("shapes", "outhere-3"),
  dice("shapes", "outhere-9"),
  dice("rings", "outhere-2"),
  dice("rings", "outhere-5"),
];

// Colours for the initials avatar, with a name for screen readers.
export const AVATAR_COLOURS = ["#00ff7f", "#3DA9FC", "#9B5CFF", "#FF6B35", "#ffd700", "#ff4f8b", "#00d4aa", "#e5e4e2"];
export const COLOUR_NAMES = {
  "#00ff7f": "Neon",
  "#3DA9FC": "Sky",
  "#9B5CFF": "Violet",
  "#FF6B35": "Ember",
  "#ffd700": "Gold",
  "#ff4f8b": "Rose",
  "#00d4aa": "Teal",
  "#e5e4e2": "Platinum",
};

/** Eases a number towards `value` on the JS thread. Good for SVG props. */
export function useTween(value, duration = 900) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    const t0 = Date.now();
    let raf;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const v = start + (target - start) * (1 - Math.pow(1 - p, 3));
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, duration]);
  return shown;
}

/**
 * The player's avatar inside a level ring: a thin track with a progress arc
 * that sweeps to `progress` (0 to 1), plus a level chip on the bottom edge.
 */
export function LevelRing({ uri, name, colour = C.accent, size = 104, progress = 0, level, stroke = 4 }) {
  const p = useTween(Math.max(0, Math.min(1, progress)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const inner = size - stroke * 2 - 10;
  return (
    <View style={{ width: size, height: size + (level != null ? 8 : 0) }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <SvgGradient id="lvl" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colour} stopOpacity="1" />
            <Stop offset="1" stopColor={C.accent} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#26262b" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#lvl)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - Math.max(0.015, p))}
        />
      </Svg>
      <View style={{ position: "absolute", top: (size - inner) / 2, left: (size - inner) / 2 }}>
        <Avatar uri={uri} name={name} colour={colour} size={inner} />
      </View>
      {level != null ? (
        <View style={{ position: "absolute", bottom: 0, alignSelf: "center", left: 0, right: 0, alignItems: "center" }}>
          <View style={{ paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center", minWidth: 52 }}>
            <Text style={{ color: C.accentText, fontFamily: F.display, fontSize: 12, letterSpacing: 0.4 }}>LVL {level}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Round avatar with an accent ring, used in the edit sheet preview. */
export function MeAvatar({ uri, name, colour = C.accent, size = 88 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: 3, borderWidth: 2, borderColor: colour }}>
      <Avatar uri={uri} name={name} colour={colour} size={size - 10} />
    </View>
  );
}

/** The OUT coin: a small neon disc. */
export function Coin({ size = 16 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.accent,
        borderWidth: Math.max(1.5, size * 0.12),
        borderColor: "#00c463",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, borderWidth: Math.max(1.2, size * 0.1), borderColor: C.accentText }} />
    </View>
  );
}

/** Cost in OUT as a pill with a coin. `dim` when the player can't afford it. */
export function CoinPill({ amount, dim = false, size = "md", style }) {
  const big = size === "lg";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          paddingLeft: 4,
          paddingRight: big ? 12 : 10,
          height: big ? 32 : 26,
          borderRadius: 99,
          backgroundColor: dim ? "rgba(255,255,255,0.06)" : "rgba(0,255,127,0.12)",
          borderWidth: 1,
          borderColor: dim ? C.border : "rgba(0,255,127,0.3)",
        },
        style,
      ]}
    >
      <Coin size={big ? 22 : 18} />
      <Text style={{ color: dim ? C.textDim : C.accent, fontFamily: F.display, fontSize: big ? 16 : 14 }}>{amount}</Text>
    </View>
  );
}
