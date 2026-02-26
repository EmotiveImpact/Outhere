import { Redirect } from "expo-router";
import { useUserStore } from "@/store/userStore";

export default function Index() {
  const isOnboarded = useUserStore((s) => s.isOnboarded);
  if (!isOnboarded) {
    return <Redirect href="/welcome" />;
  }
  return <Redirect href="/(tabs)" />;
}
