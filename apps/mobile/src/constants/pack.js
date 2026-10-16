// The Fighter Pack: a set of AI pictures of a member, made from a live face
// scan, that stand in for their photo across the game. Plan:
// https://claude.ai/code/artifact/84d2f412-7722-44d2-86af-9562c3200a08
//
// Free is locked. Pro and Black get credits on joining and every month. A pack
// spends one credit per picture; a re-roll spends one. Black also unlocks
// three more poses in each of the race, win and respect sets.

export const PACK_NAME = "Fighter Pack";

// Credits by membership. monthly tops up to cap on the 1st of each month.
export const PACK_CREDITS = {
  free: { join: 0, monthly: 0, cap: 0 },
  pro: { join: 12, monthly: 4, cap: 12 },
  black: { join: 20, monthly: 12, cap: 30 },
};

export const PACK_COST = 8; // the eight base pictures
export const REROLL_COST = 1;
export const PACK_MIN_AGE = 18;
export const SELFIE_TTL_HOURS = 24;

// The eight base pictures. `use` says where the game shows each one.
export const SLOTS = [
  { key: "profile", label: "Profile picture", use: "Your photo in every ring" },
  { key: "vs", label: "VS, facing right", use: "Your side of every 1v1" },
  { key: "vsMirror", label: "VS, facing left", use: "When you're on the right" },
  { key: "swipe", label: "Swipe card", use: "Your card in Swipe to battle" },
  { key: "sprint", label: "Night sprint", use: "Runs and stories" },
  { key: "win", label: "Win", use: "Your results card" },
  { key: "respect", label: "Respect", use: "When you lose, and rematch asks" },
  { key: "background", label: "Profile background", use: "The top of your profile" },
];

// Black-only extras, made with a Black pack.
export const BLACK_SLOTS = [
  { key: "blackEdition", label: "Black edition", use: "Your Black card" },
  { key: "clubKit", label: "Club kit", use: "In your club's colours" },
];

// Pose sets. The first pose in each set is the one Pro gets; Black picks any.
// A pose fills the slot named by `slot`.
export const POSE_SETS = [
  {
    key: "race",
    label: "Race",
    use: "Countdown and live battle",
    slot: "vs",
    poses: [
      { key: "sprint", label: "Sprint" },
      { key: "nightRun", label: "Night run" },
      { key: "hoodUp", label: "Hood up" },
      { key: "finishLean", label: "Finish lean" },
    ],
  },
  {
    key: "win",
    label: "Win",
    use: "Your results card and the loser's screen",
    slot: "win",
    poses: [
      { key: "fistUp", label: "Fist up" },
      { key: "roar", label: "Roar" },
      { key: "crown", label: "Crown" },
      { key: "pointUp", label: "Point up" },
    ],
  },
  {
    key: "respect",
    label: "Respect",
    use: "When you lose, and on your rematch ask",
    slot: "respect",
    poses: [
      { key: "nod", label: "Nod" },
      { key: "fistBump", label: "Fist bump" },
      { key: "handOnHeart", label: "Hand on heart" },
      { key: "slowClap", label: "Slow clap" },
    ],
  },
];

export const DEFAULT_POSES = Object.fromEntries(POSE_SETS.map((s) => [s.key, s.poses[0].key]));

/** True when this tier may pick this pose. */
export const poseAllowed = (tier, setKey, poseKey) => {
  const set = POSE_SETS.find((s) => s.key === setKey);
  if (!set) return false;
  if (tier === "black") return set.poses.some((p) => p.key === poseKey);
  return tier === "pro" && set.poses[0].key === poseKey;
};

// The silhouette that stands in until a member has a pack or a photo.
// "either" lets the member pick a figure; runnerFigure holds that pick.
export const RUNNERS = [
  { key: "man", label: "Man" },
  { key: "woman", label: "Woman" },
  { key: "either", label: "Rather not say" },
];

// The face scan: three angles, captured on their own.
export const SCAN_ANGLES = [
  { key: "straight", label: "Looking ahead", prompt: "Look straight at the camera" },
  { key: "left", label: "Turn left", prompt: "Slowly turn your head left" },
  { key: "right", label: "Turn right", prompt: "Slowly turn your head right" },
];

export const SCAN_RULES = [
  { icon: "sun", title: "Find good light", body: "Face a window or a lamp." },
  { icon: "glasses", title: "Hats and glasses off", body: "We need your whole face." },
  { icon: "user", title: "Just you in frame", body: "No one else, no photos of photos." },
];

// ── Helpers shared by the local engine and the Supabase twin ────────────────

// How recent the three scan shots must be for the scan to pass.
export const SCAN_MAX_AGE_MINUTES = 10;

// The pose set that fills a base slot ("vs" is the race set's first pose).
export const SET_OF_SLOT = Object.fromEntries(POSE_SETS.map((s) => [s.slot, s.key]));

/**
 * Every picture a pack makes for a tier, in order: the eight base SLOTS (the
 * first pose of each set is its base slot picture), then for Black the
 * BLACK_SLOTS and the three extra poses in each set. `cost` is what the
 * picture spends; Black extras come free with the pack.
 */
export const packPicturesFor = (tier) => {
  const base = SLOTS.map((s) => {
    const set = SET_OF_SLOT[s.key] || null;
    return { slot: s.key, set, pose: set ? DEFAULT_POSES[set] : null, cost: 1 };
  });
  if (tier !== "black") return base;
  const black = BLACK_SLOTS.map((s) => ({ slot: s.key, set: null, pose: null, cost: 0 }));
  const extras = POSE_SETS.flatMap((set) => set.poses.slice(1).map((p) => ({ slot: set.slot, set: set.key, pose: p.key, cost: 0 })));
  return [...base, ...black, ...extras];
};

/** The name a picture is stored under: its slot, or "set-pose" for an extra pose. */
export const pictureName = ({ slot, set, pose }) => (set && pose && pose !== DEFAULT_POSES[set] ? `${set}-${pose}` : slot);

/** The pose that counts for a tier: the pick when the tier allows it, else the set's first. */
export const effectivePose = (tier, setKey, pick) => (pick && poseAllowed(tier, setKey, pick) ? pick : DEFAULT_POSES[setKey]);

/**
 * player.fighter from a pack's pictures: { [slot]: url } for every slot with a
 * picture, with vs, win and respect taken from the member's pose picks when
 * their tier allows the pick and that picture exists. Null with no pictures.
 * images: [{ slot, set, pose, url }]; ones without a url are skipped.
 */
export const fighterFrom = (images, picks = {}, tier = "pro") => {
  const ready = (images || []).filter((i) => i && i.url);
  if (!ready.length) return null;
  const out = {};
  for (const img of ready) if (pictureName(img) === img.slot) out[img.slot] = img.url;
  for (const set of POSE_SETS) {
    const pose = effectivePose(tier, set.key, picks?.[set.key]);
    const hit = ready.find((i) => i.set === set.key && i.pose === pose);
    if (hit) out[set.slot] = hit.url;
  }
  return Object.keys(out).length ? out : null;
};

/** The 1st of next month (local time), when the monthly credits land. */
export const nextGrantAt = (ms = Date.now()) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
};

/** The credit rules for a tier, in the shape getPackCredits returns. */
export const packCreditRules = (tier) => PACK_CREDITS[tier] || PACK_CREDITS.free;
