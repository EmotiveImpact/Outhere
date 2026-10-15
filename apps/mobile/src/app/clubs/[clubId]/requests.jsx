// /clubs/<id>/requests (from a "wants to join" notification) opens the
// crew's join requests.

import { Redirect, useLocalSearchParams } from "expo-router";

export default function ClubRequestsLink() {
  const { clubId } = useLocalSearchParams();
  return <Redirect href={`/crew/requests/${String(clubId || "")}`} />;
}
