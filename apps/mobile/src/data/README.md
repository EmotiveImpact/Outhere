# Data layer

OutHere runs fully on the phone for now. There is no server call anywhere in the
app; the server stack will be chosen later and slotted in behind this layer.

| File | What it does |
|---|---|
| `engine.js` | Owns all state (AsyncStorage key `outhere.engine.v1`), simulates the 24 seeded players, applies every game rule. Async functions returning plain objects. |
| `hooks.js` | React Query hooks over the engine (`useProfile`, `useBattles`, ...) plus `useEngineMutation`. Screens use these. |
| `seed.js` | The seeded world: players, crews, events, drops, news, rewards, challenge templates. |
| `time.js`, `random.js` | Local-day keys and deterministic noise. |

## Rules for screens

- Read with the hooks in `hooks.js`. Never `fetch`, never import `services/api.js`.
- Write with `useEngineMutation(engine.someFn)`. Pass several arguments as an
  array: `mutate([crewId, text])`. Writes refresh every query automatically.
- A `TIER_REQUIRED` error opens the upgrade sheet on its own; other errors show
  a toast. Pass `{ silent: true }` to handle errors yourself, and
  `{ success: "Joined" }` to confirm success with a toast.
- Build UI from `components/ui` (Screen, Header, Card, Button, Segment, Pill,
  Avatar, StatTile, ProgressBar, ListRow, EmptyState, Loading) and format with
  `utils/format.js`.
- The player's own id is `"me"`. Seeded player ids start `p_`.

## Membership rules

| | Free | Pro | Black |
|---|---|---|---|
| XP multiplier | 1x | 1.2x | 1.5x |
| Crews joined / owned | 1 / 0 | 3 / 1 | 10 / 3 |
| Battles | 1 a week, 1 active | unlimited, 5 active | unlimited, 10 active |
| Rewards a week | 1 | 3 | 10 |

Black also needs a 14 day streak once. Payments are not live, so `setTier`
switches tier for free in this build.

## Testing

`npx jest src/data` runs the engine tests. Settings has a developer section
(debug builds only) to add steps, fill two weeks of history and reset.
