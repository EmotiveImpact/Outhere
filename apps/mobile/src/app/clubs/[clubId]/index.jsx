// Links of the form /clubs/<id> (the web's club pages, and notifications
// from the database) open the club page in the app.

import { Redirect, useLocalSearchParams } from "expo-router";

export default function ClubLink() {
  const { clubId } = useLocalSearchParams();
  return <Redirect href={`/crew/${String(clubId || "")}`} />;
}
