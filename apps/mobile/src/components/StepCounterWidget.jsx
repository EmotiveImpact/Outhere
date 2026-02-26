import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from "react-native";
import Svg, { Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { Footprints, ChevronRight, Clock, Flame, Zap, Route } from "lucide-react-native";

export default function StepCounterWidget({ lastRun, isCheckedIn = true, weeklyGoal = 20, onGoalChange, steps = 0, distanceKm = 0, weeklyDistanceKm = 0 }) {
  const [showSteps, setShowSteps] = useState(true);
  const [animProgress, setAnimProgress] = useState(0);

  const cycleGoal = () => {
    const next = weeklyGoal === 20 ? 30 : weeklyGoal === 30 ? 50 : 20;
    if (onGoalChange) onGoalChange(next);
  };

  const data = [45, 65, 45, 80, 55, 30, 50, 40, 90, 75, 120];
  const max = 150;

  const containerPadding = 48;
  const viewWidth = Dimensions.get("window").width - 40 - containerPadding;
  const height = 110;

  // Animate bars growing on mount
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCheckedIn) {
      Animated.spring(animValue, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: false, // We read the value via listener
      }).start();

      const id = animValue.addListener(({ value }) => {
        setAnimProgress(value);
      });
      return () => animValue.removeListener(id);
    }
  }, [isCheckedIn]);

  const barWidth = viewWidth / (data.length * 1.6);
  const spacing = (viewWidth - data.length * barWidth) / (data.length - 1);

  const accentColor = "#00ff7f";

  // Format Helpers
  const formatTime = (value) => {
    const seconds = Number.parseInt(value, 10);
    if (!Number.isFinite(seconds)) return "20:12";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPace = (value) => {
    const seconds = Number.parseInt(value, 10);
    if (!Number.isFinite(seconds)) return "6'04";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View
      style={[styles.container, !isCheckedIn && { opacity: 0.3 }]}
      pointerEvents={isCheckedIn ? "auto" : "none"}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            {showSteps ? (
              <Footprints color={accentColor} size={15} />
            ) : (
              <Route color={accentColor} size={15} />
            )}
          </View>
          <Text style={styles.headerTitle}>Daily Progress</Text>
        </View>

        <TouchableOpacity onPress={cycleGoal} style={styles.goalPill}>
          <Text style={styles.goalText}>Goal: {weeklyGoal}K</Text>
          <ChevronRight color={accentColor} size={12} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* ── MAIN STAT ── */}
      <TouchableOpacity
        onPress={() => setShowSteps(!showSteps)}
        activeOpacity={0.7}
        style={styles.statRow}
      >
        <Text style={styles.mainNumber}>
          {showSteps
            ? steps > 0
              ? steps.toLocaleString()
              : "0"
            : distanceKm > 0
            ? distanceKm.toFixed(1)
            : "0.0"}
        </Text>
        <Text style={styles.unitText}>{showSteps ? "Steps" : "KM"}</Text>
      </TouchableOpacity>
      <Text
        style={{
          color: "#555",
          fontSize: 13,
          marginTop: -12,
          marginBottom: 16,
          letterSpacing: 0.3,
        }}
      >
        {weeklyDistanceKm.toFixed(1)} / {weeklyGoal} km this week
      </Text>

      {/* ── CHART (plain Rect — no AnimatedRect to avoid crashes) ── */}
      <View style={styles.chartContainer}>
        <Svg width="100%" height={height}>
          <Defs>
            <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accentColor} stopOpacity="1" />
              <Stop offset="1" stopColor={accentColor} stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {data.map((val, i) => {
            const fullBarH = (val / max) * height;
            const barH = fullBarH * animProgress;
            const x = i * (barWidth + spacing);

            return (
              <Rect
                key={i}
                x={x}
                y={height - barH}
                width={barWidth}
                height={barH}
                rx={barWidth / 2}
                fill="url(#barGrad)"
              />
            );
          })}
        </Svg>
      </View>

      {/* ── X-AXIS TIMELINE ── */}
      <View style={styles.timelineRow}>
        <Text style={styles.axisLabel}>12 AM</Text>
        <View style={styles.activeTimePill}>
          <Text style={styles.activeTimeText}>CURRENT</Text>
        </View>
        <Text style={styles.axisLabel}>11 PM</Text>
      </View>

      {/* ── LAST RUN (Floating Inner Card) ── */}
      <View style={styles.lastRunCard}>
        <View style={styles.lastRunHeaderRow}>
          <Text style={styles.lastRunTitle}>Latest Activity</Text>
          <ChevronRight color="#666" size={14} />
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBlock}>
            <View style={styles.metricIconRow}>
              <Clock color={accentColor} size={14} />
              <Text style={styles.metricLabel}>Time</Text>
            </View>
            <Text style={styles.metricValue}>
              {formatTime(lastRun?.duration_seconds)}
            </Text>
          </View>

          <View style={styles.metricBlock}>
            <View style={styles.metricIconRow}>
              <Flame color={accentColor} size={14} />
              <Text style={styles.metricLabel}>Active Kcal</Text>
            </View>
            <Text style={styles.metricValue}>
              {lastRun?.calories || "234"}
            </Text>
          </View>

          <View style={styles.metricBlock}>
            <View style={styles.metricIconRow}>
              <Zap color={accentColor} size={14} />
              <Text style={styles.metricLabel}>Pace</Text>
            </View>
            <Text style={styles.metricValue}>
              {formatPace(lastRun?.pace_seconds_per_km)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#161618",
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(0, 255, 127, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 127, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goalText: {
    color: "#00ff7f",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 20,
  },
  mainNumber: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 60,
  },
  unitText: {
    color: "#00ff7f",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  chartContainer: {
    width: "100%",
    height: 110,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  axisLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTimePill: {
    backgroundColor: "#2a2a2c",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    position: "absolute",
    left: "55%",
    transform: [{ translateX: -20 }],
  },
  activeTimeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  lastRunCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 20,
    padding: 16,
  },
  lastRunHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  lastRunTitle: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricBlock: {
    flex: 1,
    alignItems: "flex-start",
  },
  metricIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metricLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
