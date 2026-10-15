// Pick one photo from the camera or the library. Returns { uri, width, height }
// or null when the person backs out or says no to access.

import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { toast } from "@/components/ui";

export async function pickPhoto({ camera = false, aspect } = {}) {
  try {
    const ask = camera ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { granted } = Platform.OS === "web" ? { granted: true } : await ask();
    if (!granted) {
      toast("No access", camera ? "Allow the camera for Outhere in Settings." : "Allow photos for Outhere in Settings.");
      return null;
    }
    const launch = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await launch({ mediaTypes: ["images"], quality: 0.85, allowsEditing: !!aspect, ...(aspect ? { aspect } : {}) });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, width: a.width, height: a.height };
  } catch (e) {
    toast.error(e?.message || "Couldn't open your photos.");
    return null;
  }
}
