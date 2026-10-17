// Your ticket for the start line: a real QR code the organiser scans to check
// you in, your wave and gate, and what showing up earns you.

import React from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { CalendarPlus, Check, Navigation } from "lucide-react-native";
import { useEvent, useTicket } from "@/data/hooks";
import { C, EmptyState, F, imageSource, PhotoBackground, Row, S, Skeleton } from "@/components/ui";
import { BottomBar, ButtonPair, TopBar } from "@/components/arena/OutsideKit";
import { whenWord } from "@/components/happenings/EventsScreen";
import { openDirections } from "@/components/happenings/shared";
import { addToCalendar } from "@/components/happenings/calendar";
import { formatNumber, timeLabel } from "@/utils/format";

const INK = "#0e1726";

export default function TicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams();
  const id = String(eventId || "");
  const event = useEvent(id).data;
  const { data: ticket, isPending, error } = useTicket(id);

  if (isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 70 }]}>
        <Skeleton height={420} radius={26} style={{ marginHorizontal: S.gutter }} />
        <TopBar />
      </View>
    );
  }
  if (error || !ticket) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 80 }]}>
        <EmptyState
          title={error?.code === "NOT_GOING" ? "Say you're going first" : "No ticket"}
          body="Your ticket appears once you've said you're going."
          action="Back to the event"
          onAction={() => router.replace(`/events/${id}`)}
        />
        <TopBar />
      </View>
    );
  }

  const words = (event?.title || "").split(" ");
  const half = Math.max(1, Math.floor(words.length / 2));
  const more = () =>
    Share.share({ message: `My ticket for ${event?.title}: wave ${ticket.wave}, gate ${ticket.gate}. ${timeLabel(event?.startAt)} at ${event?.location}.` }).catch(() => {});

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 70 }]}>
      {/* .hero: the event photo behind the whole ticket, at brightness .7, faded into the floor */}
      {event?.image ? (
        <PhotoBackground source={imageSource(event.image)} fade={[[0, 0.72], [0.2, 0.3], [0.42, 0.3], [0.63, 0.85], [0.82, 1], [1, 1]]} to="2,5,12" focus={{ x: 0.5, y: 0.3 }} kenBurns glow={false} grain={0} />
      ) : null}
      <View style={styles.ticket}>
        <Text style={styles.kicker}>
          Your ticket · Gate {ticket.gate}
        </Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          {words.slice(0, half).join(" ")} <Text style={{ color: C.accent }}>{words.slice(half).join(" ")}</Text>
        </Text>
        {event ? (
          <Text style={styles.when}>
            {whenWord(event.startAt)} {timeLabel(event.startAt)} · {event.location}
          </Text>
        ) : null}
        <View style={styles.qrBox} accessible accessibilityLabel="Ticket QR code">
          <QRCode value={ticket.qr} size={158} color={INK} backgroundColor="#ffffff" ecl="M" />
          {ticket.checkedIn ? (
            <View style={styles.done}>
              <Check size={34} color="#fff" strokeWidth={3} />
              <Text style={styles.doneText}>Checked in</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.tear}>
          <View style={[styles.notch, { left: -11 }]} />
          <View style={styles.dash} />
          <View style={[styles.notch, { right: -11 }]} />
        </View>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1.4 }}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value} numberOfLines={1}>
              {ticket.name}
            </Text>
          </View>
          <View style={{ flex: 0.7 }}>
            <Text style={styles.label}>Wave</Text>
            <Text style={styles.value}>{ticket.wave}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Reward</Text>
            <Text style={[styles.value, { color: C.accent }]}>+{formatNumber(event?.rewardXp || 0)} XP</Text>
          </View>
        </Row>
      </View>
      <Text style={styles.code}>{ticket.code.toUpperCase().match(/.{1,6}/g)?.join(" ")}</Text>
      <BottomBar style={{ paddingHorizontal: 22 }}>
        <ButtonPair
          secondary={{ title: "Add to calendar", icon: CalendarPlus, style: styles.footBtn, onPress: () => event && addToCalendar(event) }}
          primary={{ title: "Directions", icon: Navigation, variant: "secondary", style: styles.footBtn, onPress: () => event && openDirections(event.location, event.city) }}
        />
        <Text style={styles.hint}>Scan at the start line to check in. Turn your screen brightness up if it won't read.</Text>
      </BottomBar>
      <TopBar onMore={more} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  footBtn: { flex: 1, height: 46, paddingHorizontal: 10 },
  // .ticket: the white pass, lifted off the photo
  ticket: { marginHorizontal: 22, borderRadius: 26, backgroundColor: "#f4f5f7", paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16, alignItems: "stretch", boxShadow: "0 30px 60px -10px rgba(0,0,0,0.6)" },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  title: { color: "#0b1a33", fontFamily: F.display, fontSize: 32, lineHeight: 34, textTransform: "uppercase", textAlign: "center", marginTop: 6 },
  when: { color: "#5b6576", fontFamily: F.body, fontSize: 11.5, textAlign: "center", marginTop: 4 },
  qrBox: { alignSelf: "center", marginTop: 16, marginBottom: 4, padding: 10, borderRadius: 18, backgroundColor: "#fff", boxShadow: "0 0 0 1px #e3e6ea" },
  done: { ...StyleSheet.absoluteFill, borderRadius: 18, backgroundColor: "rgba(61,139,255,0.92)", alignItems: "center", justifyContent: "center", gap: 6 },
  doneText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 15 },
  tear: { height: 30, justifyContent: "center", marginHorizontal: -20 },
  dash: { marginHorizontal: 0, borderTopWidth: 2, borderStyle: "dashed", borderColor: "#d5dae1" },
  notch: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: "#0a0d12", top: 4 },
  label: { color: "#5b6576", fontFamily: F.body, fontSize: 10 },
  value: { color: "#0b1a33", fontFamily: F.bodySemi, fontSize: 13, marginTop: 2 },
  code: { color: "rgba(201,211,227,0.6)", fontFamily: F.bodyMedium, fontSize: 11, letterSpacing: 2, textAlign: "center", marginTop: 12 },
  hint: { color: "#c9d3e3", fontFamily: F.body, fontSize: 11.5, textAlign: "center", marginTop: 12, lineHeight: 16 },
});
