// Whether the phone has a connection. Offline only when the system says so,
// so an unknown state (first render) reads as online. On the web only the
// browser's own online flag counts.

import { Platform } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

export function useOnline() {
  const net = useNetInfo();
  if (net.isConnected === false) return false;
  if (Platform.OS !== "web" && net.isInternetReachable === false) return false;
  return true;
}

// Design checks only: a web build made with EXPO_PUBLIC_STATE_PREVIEW=1
// shows Home's loading, error and offline states from ?state=...
export const STATE_PREVIEW = process.env.EXPO_PUBLIC_STATE_PREVIEW === "1";

// The ?state= the page was opened with, read once at load because the first
// redirect drops the query.
export const OPENED_WITH_STATE =
  STATE_PREVIEW && typeof window !== "undefined" && window.location?.search ? new URLSearchParams(window.location.search).get("state") : null;
