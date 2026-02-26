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