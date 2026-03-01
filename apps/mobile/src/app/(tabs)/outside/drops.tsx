import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Clock3, Crown, Lock, Package, Sparkles } from "lucide-react-native";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";

const NEON = "#00ff7f";
const SURFACE = "#161618";
const GOLD = "#ffd700";

const ACTIVE_DROP = {
  id: "drop-active",
  title: "OutHere Performance Tee",
  subtitle: "Limited edition. First come, first served.",
  endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 11 * 60 * 1000),
  cost: 150,
  currency: "OUT",
  stock: 47,
  totalStock: 100,
};

const PAST_DROPS = [
  { id: "pd1", title: "Sponsor Recovery Kit", date: "Feb 20", claimed: 100, total: 100 },
  { id: "pd2", title: "Crew Logo Sticker Pack", date: "Feb 12", claimed: 82, total: 100 },
  { id: "pd3", title: "OutHere Snapback Cap", date: "Jan 30", claimed: 150, total: 150 },
];

const formatCountdown = (target: Date) => {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};

export default function OutsideDropsScreen() {
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("drops");
  const [countdown, setCountdown] = useState(formatCountdown(ACTIVE_DROP.endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(ACTIVE_DROP.endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stockPct = Math.min(100, (ACTIVE_DROP.stock / ACTIVE_DROP.totalStock) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Active Drop Hero Card ─── */}
        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(0,255,127,0.25)",
            padding: 20,
            marginBottom: 16,
          }}
        >
          {/* LIVE badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(0,255,127,0.12)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: NEON,
                  shadowColor: NEON,
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
              <Text style={{ color: NEON, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                LIVE
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Package color="#777" size={12} />
              <Text style={{ color: "#777", fontSize: 11, fontWeight: "600" }}>
                {ACTIVE_DROP.stock}/{ACTIVE_DROP.totalStock} left
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "900",
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            {ACTIVE_DROP.title}
          </Text>
          <Text style={{ color: "#777", fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
            {ACTIVE_DROP.subtitle}
          </Text>

          {/* Countdown timer */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {[
              { val: countdown.days, label: "D" },
              { val: countdown.hours, label: "H" },
              { val: countdown.minutes, label: "M" },
              { val: countdown.seconds, label: "S" },
            ].map((unit, i) => (
              <React.Fragment key={unit.label}>
                {i > 0 && (
                  <Text style={{ color: "#555", fontSize: 20, fontWeight: "800", marginHorizontal: 2 }}>
                    :
                  </Text>
                )}
                <View
                  style={{
                    backgroundColor: "#111113",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#2a2a2d",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    alignItems: "center",
                    minWidth: 52,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
                    {unit.val}
                  </Text>
                  <Text style={{ color: "#555", fontSize: 9, fontWeight: "700", marginTop: 2 }}>
                    {unit.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Stock bar */}
          <View
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: "#232326",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: `${stockPct}%`,
                height: "100%",
                backgroundColor: NEON,
                borderRadius: 3,
              }}
            />
          </View>
          <Text style={{ color: NEON, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
            {ACTIVE_DROP.cost} OUT to claim
          </Text>
        </View>

        {/* ─── Early Access Banner ─── */}
        <View
          style={{
            backgroundColor: "rgba(255,215,0,0.06)",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(255,215,0,0.15)",
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Crown color={GOLD} size={16} />
            <Text style={{ color: GOLD, fontSize: 14, fontWeight: "800" }}>
              Early Access
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Sparkles color="#a78bfa" size={11} />
                <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "700" }}>PRO</Text>
              </View>
              <Text style={{ color: "#888", fontSize: 11, lineHeight: 16 }}>
                24h early access to every drop
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#2a2a2d" }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Crown color={GOLD} size={11} />
                <Text style={{ color: GOLD, fontSize: 11, fontWeight: "700" }}>BLACK</Text>
              </View>
              <Text style={{ color: "#888", fontSize: 11, lineHeight: 16 }}>
                48h early + exclusive Black-only drops
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Previous Drops ─── */}
        <Text
          style={{
            color: "#555",
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Previous Drops
        </Text>

        {PAST_DROPS.map((drop) => (
          <View
            key={drop.id}
            style={{
              backgroundColor: SURFACE,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#1e1e20",
              padding: 14,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: 0.6,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#aaa", fontSize: 14, fontWeight: "700" }}>
                {drop.title}
              </Text>
              <Text style={{ color: "#555", fontSize: 11, marginTop: 3 }}>
                {drop.date} · {drop.claimed}/{drop.total} claimed
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "#1b1b1d",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#555", fontSize: 10, fontWeight: "700" }}>ENDED</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
