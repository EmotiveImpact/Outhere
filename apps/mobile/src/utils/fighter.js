// Which picture stands for a player in the game. In order: their Fighter Pack
// picture for that place, then their own photo, then a runner silhouette (man
// or woman, from their runner choice). Never the shared stock fighter, so two
// members without photos don't look like the same person in a 1v1.
//
// The silhouette files are already greyed down (grayscale, 75% brightness, as
// in the mock), so they can go anywhere a photo goes.
//
// player.fighter is { [slot]: url } once a pack is ready (see SLOTS in
// constants/pack.js). player.runner is "man" | "woman" | "either", and
// player.runnerFigure the figure an "either" member picked.

import { PHOTOS } from "@/constants/photos";
import { imageSource } from "@/components/ui";
import { tierLabel } from "@/utils/format";

export const silhouetteFor = (player) => {
  const figure = player?.runner === "either" ? player?.runnerFigure : player?.runner;
  return figure === "woman" ? PHOTOS.silhouetteFemale : PHOTOS.silhouetteMale;
};

/**
 * kind: a pack slot ("vs", "vsMirror", "profile", "win", "respect", ...).
 * Returns { source, isSilhouette }.
 */
export const fighterPhoto = (player, kind = "vs") => {
  const packed = player?.fighter?.[kind] || (kind === "vsMirror" ? player?.fighter?.vs : null);
  if (packed) return { source: imageSource(packed), isSilhouette: false };
  const own = imageSource(player?.avatar);
  if (own) return { source: own, isSilhouette: false };
  return { source: silhouetteFor(player), isSilhouette: true };
};

/** True when the player has a ready Fighter Pack. */
export const hasPack = (player) => !!player?.fighter?.vs;

/** The small line under a name on a versus header: "Level 14 · Pro". */
export const playerSub = (player) => {
  if (!player) return null;
  const level = typeof player.level === "number" ? player.level : player.level?.level;
  return [level ? `Level ${level}` : null, tierLabel(player.tier)].filter(Boolean).join(" · ");
};
