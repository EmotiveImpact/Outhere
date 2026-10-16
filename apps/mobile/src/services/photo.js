// Picks a square photo for a profile and makes it small enough to upload
// (512 px, JPEG). Returns its local uri, or null when nothing was picked.

import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

export async function pickAvatarPhoto() {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  const small = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
  return small.uri;
}
