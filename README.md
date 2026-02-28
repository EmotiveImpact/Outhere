# OUT HERE

**WE OUTSIDE.**

A social movement app for the urban crowd — London, New York, Accra, Manchester, Lagos. Not a gym app. Not a running app. An app for people who **move** through their city every single day.

---

## The Core Idea

The city is your gym. OUT HERE rewards you for using it.

- Walking to the tube? That counts.
- Running through Central Park? That counts.
- Cycling across the bridge? That counts.
- Just stepping outside and moving? **That counts.**

The currency is **steps** and **distance**. The culture is your city.

---

## App Structure

### 5 Tabs

| Tab | Name | Purpose |
|---|---|---|
| 🏠 | **Home** | Dashboard — your daily stats, check-in, who's outside, leaderboard preview |
| 🚀 | **MOVE** | The active session screen — live steps/distance/time while you're moving |
| 👥 | **Club** | Your crew — leaderboard, social feed, group challenges |
| ⚔️ | **Challenges** | 1v1 battles, daily tasks, achievements, XP stakes |
| 👤 | **Activity** | Your profile, session history, stats, settings |

---

## Why "MOVE" Not "Run"

Running is one thing. Urban movement is everything.

A New Yorker walks 2 miles getting to work — that's movement. A Londoner cycles to a meeting — that's movement. Someone in Accra walks across the market at pace — that's movement.

**MOVE** is the tab that captures a session — any form of getting out and going. When you tap MOVE, you start a **Movement Session**:
- Steps tracked in real-time
- Distance calculated
- Duration counted
- City contribution updated
- XP earned

---

## The MOVE Screen — Three States

### 🟢 Ready (Pre-Session)
```
  TODAY YOU'VE DONE
  3,200 steps · 2.4 km

  [  WHO'S MOVING NOW  ]
  👤 👤 👤  3 people from your club

         ╔═══════╗
         ║ MOVE  ║  ← Big glowing button
         ╚═══════╝

  GPS ● READY        STREAK 🔥 7 DAYS
```

### 🔴 Moving (Active Session)
```
  ● LIVE · 00:12:34

       8,420
       STEPS

    4.2 KM   5'48 PACE

  [ BROADCAST: I'M OUTSIDE ]

       [ STOP ]
```

### 🏆 Done (Session Summary)
```
  GREAT MOVE

  12,500 steps   9.2 km   45 min

  +150 XP earned
  🔥 Streak: 8 days

  [  SHARE  ]    [  DONE  ]
```

---

## Feature Breakdown

### ✅ Built
- Check-in (Home screen, AsyncStorage-persisted, earns XP display)
- Step tracking (expo-sensors pedometer, live on device)
- Weekly goal (persisted, cycleable)
- Onboarding (username + city, DEV BYPASS)
- Club leaderboard, feed, challenges
- Premium design system (`#0a0a0a` / `#161618` / `#00ff7f`)

### 🔲 Next Up
1. **MOVE screen** — Replace Run tab, build proper session tracker
2. **XP system** — Real XP earned, persisted, displayed
3. **Streak counter** — Consecutive check-in days
4. **City grouping** — London vs NY vs Accra on leaderboard
5. **Session history** — Save + display past movement sessions

### � Future
- 1v1 step battles (live scoring)
- "I'm Outside" broadcast to club
- Weekly recap shareable card
- City-wide events and challenges
- Streak freeze (premium feature)

---

## The Urban Crowd

OUT HERE is built for people in:

| City | The Scene |
|---|---|
| **London** | Tube walkers, park joggers, City commuters, South Bank runners |
| **New York** | Central Park, Brooklyn Bridge, subway sprinters |
| **Accra** | Street movers, early morning walkers |
| **Manchester** | Canal runners, Northern Quarter walkers |
| **Lagos** | Urban movers who grind daily |

The leaderboard is your city. Your competition is your city. Your pride is your city.

---

## Design Language

| Token | Value |
|---|---|
| Background | `#0a0a0a` |
| Card surface | `#161618` |
| Accent | `#00ff7f` |
| Font weight (headings) | `800` |
| Letter spacing | `-0.5` to `-1` |
| Border radius | `22-32` |
| Shadows | Deep, glowing |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React Native (Expo) |
| State | Zustand + AsyncStorage |
| API | Native fetch → FastAPI + Supabase |
| Sensors | expo-sensors (Pedometer) |
| Routing | Mapbox Directions API (`walking` profile) |
| Map Tiles | Google Maps (Expo Go) / Mapbox Dark v11 (Dev Build) |

### 🗺️ Map & Routing

The Move screen uses a **dual-layer architecture**:

| Layer | Provider | Notes |
|---|---|---|
| **Route Calculation** | Mapbox Directions API | Walking profile — knows park footpaths, pedestrian cut-throughs. Falls back to OSRM if Mapbox fails. |
| **Map Tiles (Expo Go)** | Google Maps | Dark custom theme. Works in Expo Go out of the box. |
| **Map Tiles (Production)** | Mapbox Dark v11 | Premium dark map, no Google logo. Requires dev build (`npx expo run:ios`). |

**To upgrade map visuals to Mapbox:**
1. Restore `move.jsx` from the Mapbox branch: `git checkout mapbox-tiles -- apps/mobile/src/app/(tabs)/move.jsx`
2. Add the `@rnmapbox/maps` plugin back to `app.json`
3. Run `npx expo run:ios` (first build ~5 min, then hot-reload works normally)

> **Note:** `@rnmapbox/maps` requires native modules that Expo Go does not support. This is a permanent Expo limitation, not version-specific.

---

### 🥽 Experimental: AR Vision Mode (Pseudo-AR)

True SLAM-based AR navigation (like ARKit/ARCore) relies heavily on native modules not available in standard Expo Go. However, a "Pseudo-AR" HUD effect can be achieved by placing a live camera feed behind a highly transparent map. We prototyped this capability but removed it to keep the app lean.

To revisit the AR overlay in the future, implement the following in `move.jsx`:

1. Add `expo-camera` dependencies and permissions state:
```javascript
import { CameraView, useCameraPermissions } from "expo-camera";
const [cameraPermission, requestCameraPermission] = useCameraPermissions();
```

2. Define a transparent map style (`arMapStyle`):
```javascript
const arMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#000000" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  // ... apply to water, poi, administrative, and road geometry
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
];
```

3. Wrap the map in a container and place the camera behind it conditionally:
```javascript
<View style={StyleSheet.absoluteFillObject}>
  {navMode === "ar" && cameraPermission?.granted && (
    <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
  )}
  <MapView
    style={[StyleSheet.absoluteFillObject, { opacity: navMode === "ar" ? 0.35 : 1 }]}
    customMapStyle={navMode === "ar" ? arMapStyle : mapCustomStyle}
    showsBuildings={navMode === "ar" ? false : true}
    // ...
  >
</View>
```

4. Force camera parameters for extreme HUD orientation:
```javascript
mapRef.current.animateCamera({
  pitch: isAr ? 85 : 45,
  altitude: isAr ? 10 : 800,
  zoom: isAr ? 21 : 15.5,
});
```


## Development Status

### Tier 1: Must-Have (✅ Completed)
- **Run/MOVE Screen Redesign**: Full restyle wired to pedometer hook. Shows live steps, distance, duration with a real timer. Start/stop with haptic feedback.
- **XP System**: An actual XP store where activity earns XP. Persisted via AsyncStorage.
- **Streak System**: Track and display consecutive days checked in on the Home screen and Profile.

### Tier 2: Sticky Features (✅ Completed)
- **"I'm Outside" Status**: A story-like feature to broadcast to your club that you're outside. Shows a green dot on your avatar.
- **Achievement Unlocks**: Full-screen celebration with confetti + haptics when completing a session.
- **Live 1v1 Step Battles**: UI implemented on Challenges page (Backend logic pending).

### Tier 3: Premium Polish (✅ Completed)
- **Animated Step Chart**: `StepCounterWidget` features an animated bar chart that grows on screen entry.
- **City Leaderboard**: Integrated city tracking into the club leaderboard with location filtering.
- **Weekly Recap Card**: A beautiful card displaying your weekly stats on the Activity profile.
- **Club Screen Redesign**: Ultra-premium redesign of the Club screen to reduce clutter and improve layout hierarchy while preserving all features.