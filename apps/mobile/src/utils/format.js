// Display formatters shared by every screen. British conventions throughout.

export const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString("en-GB");

export const compactNumber = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 1000)}k`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(v));
};

export const formatKm = (km, units = "km", digits = 1) => {
  const v = Number(km) || 0;
  if (units === "mi") return `${(v * 0.621371).toFixed(digits)} mi`;
  return `${v.toFixed(digits)} km`;
};

export const formatDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
};

export const formatPace = (secPerKm) => {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
};

export const timeAgo = (ms) => {
  const diff = Date.now() - Number(ms);
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(Number(ms)).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// "2d 4h", "3h 12m", "8m 05s"
export const countdown = (toMs, from = Date.now()) => {
  const diff = Math.max(0, Number(toMs) - from);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

export const dateLabel = (ms) =>
  new Date(Number(ms)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const timeLabel = (ms) =>
  new Date(Number(ms)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export const tierLabel = (tier) => (tier === "black" ? "Black" : tier === "pro" ? "Pro" : "Free");

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 5) return "Late one";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};
