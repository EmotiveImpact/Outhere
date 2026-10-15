// Put an event in the phone's calendar using the system's own add screen,
// so we never need calendar permission.

import { Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { toast } from "@/components/ui";

export async function addToCalendar(event) {
  if (Platform.OS === "web") {
    toast("Add it from your phone", "Calendars open from the app.");
    return false;
  }
  try {
    const result = await Calendar.createEventInCalendarAsync({
      title: event.title,
      startDate: new Date(event.startAt),
      endDate: new Date(event.endAt || event.startAt + 2 * 3_600_000),
      location: [event.location, event.city].filter(Boolean).join(", "),
      notes: event.description || "",
    });
    if (result?.action === "saved") toast.success("In your calendar");
    return result?.action === "saved";
  } catch {
    toast("Couldn't open your calendar");
    return false;
  }
}
