// Preview builds (the web preview Edem looks at, and debug builds) can open
// on the lived-in day from the signed-off prototype. Set EXPO_PUBLIC_PREVIEW=1
// when exporting a preview. Store builds never show it.
export const PREVIEW = __DEV__ || process.env.EXPO_PUBLIC_PREVIEW === "1";
