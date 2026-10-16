// The Crew tab's seeded world: richer chat and feed for the clubs people
// usually join first, crew challenges, chat lines members drop in over the
// day, and replies when you post. Times are hours before the crew is first
// opened, so the chat always looks current.

import { PHOTOS } from "@/constants/photos";

export const CREW_PHOTOS = {
  bars: require("../../assets/images/crew/bars.jpg"),
  owl: require("../../assets/images/crew/owl.jpg"),
  coastal: require("../../assets/images/crew/coastal.jpg"),
  sunlit: require("../../assets/images/crew/sunlit.jpg"),
  trail: require("../../assets/images/crew/trail.jpg"),
};

// Photo keys used by challenges and posts, so the database can name them too.
export const photoFor = (key) => CREW_PHOTOS[key] || PHOTOS[key] || null;

// Chat, per crew. kind: text, photo, route, battle. hoursAgo first.
export const CREW_CHAT_V2 = {
  c_southbank: [
    { h: 3.2, by: "p_kemi", kind: "text", text: "Who's up for Bridges at 6 tomorrow?" },
    { h: 3.0, by: "p_jay", kind: "route", data: { title: "Bridges at Night", km: 8.2, startInHours: 14.5 }, reactions: { flame: ["p_kemi", "p_rio", "p_lena", "p_tunde"] }, going: ["p_kemi", "p_rio"] },
    { h: 2.6, by: "p_rio", kind: "text", text: "In. Bringing Tomi from work" },
    { h: 1.4, by: "p_lena", kind: "photo", photo: "chatsnap", text: "Tower Bridge just now", reactions: { heart: ["p_kemi", "p_jay", "p_rio", "p_tunde", "p_dre", "p_amara"], flame: ["p_jay", "p_kemi"] } },
    { h: 0.6, by: "p_tunde", kind: "battle", data: { rivalId: "p_rio", rivalName: "Rio", won: true, out: 50 } },
  ],
  c_peckham: [
    { h: 5, by: "p_kemi", kind: "text", text: "Rye loop Wednesday, usual time." },
    { h: 2, by: "p_dre", kind: "route", data: { title: "Rye and back", km: 6.1, startInHours: 20 }, reactions: { flame: ["p_kemi"] } },
  ],
};

// Feed, per crew. kind: photo (with stats), run (route map), going, badge.
export const CREW_FEED_V2 = {
  c_southbank: [
    { h: 0.37, by: "p_kemi", kind: "photo", others: 4, title: "Bridges at Night", photo: "selfie", km: 8.2, paceSec: 291, out: 31, caption: "Dawn crew. Five bridges done before the city woke up.", likes: 24, comments: [["p_jay", "Five bridges before 7. Animals."], ["p_rio", "Next week I'm in"], ["p_lena", "That light though"], ["p_tunde", "Proper crew run"], ["p_dre", "Saving this route"], ["p_amara", "Need this energy"]] },
    { h: 2.2, by: "p_jay", kind: "run", title: "River Loop", place: "Southwark", km: 6.4, paceSec: 310, out: 22, caption: "", likes: 11, comments: [["p_kemi", "Nice negative split"]] },
    { h: 1.0, by: "p_lena", kind: "going", title: "Bridges 5k", likes: 3, comments: [] },
    { h: 3.1, by: "p_rio", kind: "badge", title: "Night Owl", sub: "5 runs after 9pm", badge: "owl", likes: 12, comments: [] },
  ],
};

// What members drop into the chat through the day.
export const AMBIENT_LINES = [
  "Anyone out tonight?",
  "Legs are gone after Saturday",
  "Who's got the route for Thursday?",
  "Just did 5k round the park, felt good",
  "Bringing a mate on Tuesday",
  "Rain or not, I'm there",
  "New shoes, first run tomorrow",
  "That hill on the way back nearly finished me",
];

// Replies when you post in the chat.
export const REPLY_LINES = ["Love it", "I'm in", "Count me in", "Nice one", "See you there", "Same time next week?", "Proper"];

// Weekly crew challenges (the database seeds the same four).
export const CREW_CHALLENGES = [
  { id: "sunrise", title: "Sunrise Club", description: "5 runs before 8am", kind: "early_runs", target: 5, image: "chatsnap" },
  { id: "area_cup", title: "Area Cup", description: "Beat the crew above you by Sunday", kind: "beat_rival", target: null, image: "crest" },
  { id: "night_owls", title: "Night Owls", description: "3 runs after 9pm", kind: "late_runs", target: 3, image: "owl" },
  { id: "long_sunday", title: "Long Sunday", description: "10 km in one go on Sunday", kind: "long_run", target: 10, image: "trail" },
];

// Report reasons, in the words people pick from and the codes we store.
export const REPORT_REASONS = [
  { value: "spam", label: "Spam or selling" },
  { value: "abuse", label: "Mean or bullying" },
  { value: "unsafe", label: "Shows where someone lives" },
  { value: "other", label: "Something else" },
];
