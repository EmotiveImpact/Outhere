# Native targets: watch, widgets and Live Activity

Settings > Watch, widgets and lock screen shows previews of these
(`src/app/previews.jsx`, built from `src/components/previews/`). The real
versions are native iOS code that sits beside the Expo app. None of it is in
the app yet, and no packages for it are installed.

## How they get into this Expo app

1. Add the config plugin `@bacons/apple-targets`. Each target gets a folder,
   `apps/mobile/targets/<name>/`, holding an `expo-target.config.js` and its
   Swift sources.
2. `npx expo prebuild -p ios` turns those folders into Xcode targets. The `ios`
   folder stays generated, not committed.
3. Build and sign with EAS (`eas build -p ios`). Each target needs its own
   bundle id under `com.outhere.app` (for example `com.outhere.app.widgets`)
   and its entitlements; EAS sets up the extra credentials in the same flow.
4. A small native module (Expo Modules API) lets the JavaScript side do what it
   can't do alone: write to the App Group, reload widgets, start, update and end
   the Live Activity, and talk to the watch.

`src/components/previews/data.js` gathers exactly the data each one shows, from
the same hooks the app uses, so the snapshot the native side reads can be built
from it.

## 1. Apple Watch app

What it needs:

- A watchOS app target in SwiftUI (`type: "watch"` in apple-targets).
- Watch Connectivity (`WCSession`) to the phone: application context for the
  latest numbers, messages for taps (start, emotes, answer a challenger, check
  in, finish).
- HealthKit on the watch: an `HKWorkoutSession` so a run keeps recording with
  the screen off, with distance, steps and heart rate. Core Location on the
  watch for runs without the phone. Haptics for splits and turns.
- A watch face complication (WidgetKit on watchOS) for steps, streak and who's
  out.

Data from the app: steps today and the goal, streak, how many are out in your
city; the chosen route (name, distance, path and turns); the live run if it
started on the phone; the live battle (rival, both scores, end time) and your
emote tray; the club v club fixture (both clubs and scores, squad out, end
time, your part in the average); a mystery challenger (level band, stake,
expiry); the next club run (club, crest, place, time, check in open); and the
saved run (distance, OUT, XP, streak, where the battle stands). Back to the
app: runs recorded on the watch, answers and check ins, which go through the
same engine calls as the phone.

## 2. Home screen widgets

What it needs:

- A WidgetKit extension (`type: "widget"`) with the large and small widgets
  from the prototype, and lock screen accessory widgets.
- An App Group (for example `group.com.outhere.app`) shared by the app and the
  extension. Widgets can't run the app's JavaScript, so the app writes a small
  JSON snapshot there and calls `WidgetCenter.reloadAllTimelines()` when it
  changes. iOS limits refreshes, so write on real changes: steps every few
  hundred, the battle score, a new day.
- `outhere://` links so a tap opens the right screen.

Data from the app: steps today and the goal, streak, the battle rival and your
lead, how many are out now, the crew name with this week's km and goal, and
the next event (title, start time, whether you're going).

## 3. Live Activity and Dynamic Island

What it needs:

- ActivityKit. The Live Activity and Dynamic Island views live in the widget
  extension above; an `ActivityAttributes` type is shared by the app and the
  extension.
- `NSSupportsLiveActivities` set to true in `ios.infoPlist` in `app.json`.
- The app starts the activity when a run starts, updates it every few seconds
  and on pause or resume, and ends it on finish. Pause and Finish on the lock
  screen are App Intents (`LiveActivityIntent`, iOS 17 and later).
- Runs with the phone locked need background location: `UIBackgroundModes`
  with `location`, and the matching permission text. The app only asks for
  location while in use today.
- For the battle on the lock screen while the app is closed, updates come by
  push (ActivityKit push tokens through APNs), which needs a server.

Data from the app: running or paused (blue dot or red dot), distance, when the
run started and total paused time (so the system ticks the clock itself),
pace, steps, OUT so far, the route name or goal and the distance left. For the
battle version: rival, both scores and the end time. The club nudge under it is
an ordinary push notification.

## Suggested order

Widgets and the App Group first (smallest, and the snapshot is reused), then
the Live Activity in the same extension, then the watch app. Android
equivalents (Glance widgets, a Wear OS app) are not covered here.
