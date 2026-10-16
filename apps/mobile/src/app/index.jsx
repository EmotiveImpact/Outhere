import { Redirect } from "expo-router";
import { useProfile } from "@/data/hooks";

export default function Index() {
  const { data: profile } = useProfile();
  return <Redirect href={profile ? "/(tabs)" : "/welcome"} />;
}
