// The prototype's own icon set (demo v29, 40 hand-drawn icons: 24 grid,
// 1.8 stroke, round ends). Edem prefers these to the stock set, so the
// icons that have a prototype version are drawn here and every other name
// falls through to lucide. Import icons from here, never from lucide directly.
//
//   import { Flame, Lock } from "@/components/ui/icons";

import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export * from "lucide-react-native";

const make = (name, draw) => {
  const Icon = ({ size = 24, color = "currentColor", strokeWidth = 1.8, style, ...rest }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} {...rest}>
      {draw(color, strokeWidth)}
    </Svg>
  );
  Icon.displayName = name;
  return Icon;
};

const DRAW = {
  arrow: (c, w) => <><Path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" /></>,
  bag: (c, w) => <><Path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3zM9 10V7a3 3 0 0 1 6 0v3" /></>,
  bell: (c, w) => <><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></>,
  bolt: (c, w) => <><Path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12z" /></>,
  cal: (c, w) => <><Rect x="3.5" y="5" width="17" height="15.5" rx="3" /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  camera: (c, w) => <><Path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></>,
  chat: (c, w) => <><Path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H8.5z" /></>,
  chev: (c, w) => <><Path d="M5.5 6.5 11 12l-5.5 5.5M12.5 6.5 18 12l-5.5 5.5" /></>,
  clock: (c, w) => <><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7.5V12l3 2" /></>,
  club: (c, w) => <><Circle cx="9" cy="8.5" r="3.2" /><Path d="M3 19.5c.9-3.3 3.2-5 6-5s5.1 1.7 6 5" /><Path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.8.6 3 2.2 3.5 4.9" /></>,
  compass: (c, w) => <><Circle cx="12" cy="12" r="8.5" /><Path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5z" /></>,
  flame: (c, w) => <><Path d="M12 3s5.5 4.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.6 1.6-4.3 1.6-4.3s.6 2.6 2.6 2.6C10.7 7.3 12 5.3 12 3z" /></>,
  ghost: (c, w) => <><Path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z" /><Path d="M10 10.5h.01M14 10.5h.01" strokeWidth={w * 1.44} /></>,
  heart: (c, w) => <><Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" /></>,
  home: (c, w) => <><Path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z" /></>,
  layers: (c, w) => <><Path d="M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" /></>,
  left: (c, w) => <><Path d="M14.5 6 8.5 12l6 6" /></>,
  loc: (c, w) => <><Path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><Circle cx="12" cy="12" r="5.5" /><Circle cx="12" cy="12" r="1.6" fill={c} /></>,
  lock: (c, w) => <><Rect x="5" y="10.5" width="14" height="10" rx="2.5" /><Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  more: (c, w) => <><Circle cx="6" cy="12" r="1.4" fill={c} stroke="none" /><Circle cx="12" cy="12" r="1.4" fill={c} stroke="none" /><Circle cx="18" cy="12" r="1.4" fill={c} stroke="none" /></>,
  motion: (c, w) => <><Circle cx="13.5" cy="4.5" r="1.8" /><Path d="M8 21l3-6 3 3v3M6.5 12.5 9 9l4 1 2.5 3.5 3 .5M11 15l2-5" /></>,
  move: (c, w) => <><Circle cx="6" cy="18" r="2.2" /><Circle cx="18" cy="6" r="2.2" /><Path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></>,
  nav: (c, w) => <><Path d="M12 3 19 20l-7-4-7 4z" /></>,
  news: (c, w) => <><Rect x="4" y="4.5" width="16" height="15" rx="2.5" /><Path d="M8 9h8M8 12.5h8M8 16h5" /></>,
  pause: (c, w) => <><Path d="M9 6v12M15 6v12" strokeWidth={w * 1.44} /></>,
  pin: (c, w) => <><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><Circle cx="12" cy="10" r="2.3" /></>,
  play: (c, w) => <><Path fill={c} stroke="none" d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8a.8.8 0 0 0-1.2.7z" /></>,
  plus: (c, w) => <><Path d="M12 5v14M5 12h14" /></>,
  save: (c, w) => <><Path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /></>,
  search: (c, w) => <><Circle cx="11" cy="11" r="6.5" /><Path d="m16 16 4 4" /></>,
  send: (c, w) => <><Path d="M4.5 12 20 4.5 15.5 20l-3-6.5zM12.5 13.5 20 4.5" /></>,
  share: (c, w) => <><Path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" /></>,
  // Crossed swords with proper hilts: the prototype's single slanted sword didn't read as a 1v1 (Edem, 2026-10-17).
  swords: (c, w) => <><Path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" /></>,
  tick: (c, w) => <><Path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  torch: (c, w) => <><Path d="M8 3h8l-1 5H9zM9 8h6v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" /></>,
  trophy: (c, w) => <><Path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5v3.5M8.5 20.5h7M9.5 20.5c0-2 1-3.5 2.5-3.5s2.5 1.5 2.5 3.5" /></>,
  turn: (c, w) => <><Path d="M15 20v-7a3 3 0 0 0-3-3H5M9 6 5 10l4 4" /></>,
  undo: (c, w) => <><Path d="M9 14 4.5 9.5 9 5M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /></>,
  up: (c, w) => <><Path d="M5 15.5l5-5 3.5 3.5L19 8.5M14.5 8.5H19V13" /></>,
  user: (c, w) => <><Circle cx="12" cy="8" r="3.8" /><Path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" /></>,
};

export const ArrowRight = make("ArrowRight", DRAW.arrow);
export const Bell = make("Bell", DRAW.bell);
export const Bookmark = make("Bookmark", DRAW.save);
export const Calendar = make("Calendar", DRAW.cal);
export const CalendarDays = make("CalendarDays", DRAW.cal);
export const Camera = make("Camera", DRAW.camera);
export const Check = make("Check", DRAW.tick);
export const ChevronLeft = make("ChevronLeft", DRAW.left);
export const ChevronsRight = make("ChevronsRight", DRAW.chev);
export const Clock = make("Clock", DRAW.clock);
export const Clock3 = make("Clock3", DRAW.clock);
export const Compass = make("Compass", DRAW.compass);
export const CornerUpLeft = make("CornerUpLeft", DRAW.turn);
export const Crosshair = make("Crosshair", DRAW.loc);
export const Ellipsis = make("Ellipsis", DRAW.more);
export const Flame = make("Flame", DRAW.flame);
export const Flashlight = make("Flashlight", DRAW.torch);
export const Footprints = make("Footprints", DRAW.motion);
export const Ghost = make("Ghost", DRAW.ghost);
export const Heart = make("Heart", DRAW.heart);
export const Home = make("Home", DRAW.home);
export const House = make("House", DRAW.home);
export const Layers = make("Layers", DRAW.layers);
export const LocateFixed = make("LocateFixed", DRAW.loc);
export const Lock = make("Lock", DRAW.lock);
export const MapPin = make("MapPin", DRAW.pin);
export const MessageCircle = make("MessageCircle", DRAW.chat);
export const MessageSquare = make("MessageSquare", DRAW.chat);
export const MoreHorizontal = make("MoreHorizontal", DRAW.more);
export const Navigation = make("Navigation", DRAW.nav);
export const Newspaper = make("Newspaper", DRAW.news);
export const Pause = make("Pause", DRAW.pause);
export const PersonStanding = make("PersonStanding", DRAW.motion);
export const Play = make("Play", DRAW.play);
export const Plus = make("Plus", DRAW.plus);
export const RotateCcw = make("RotateCcw", DRAW.undo);
export const Route = make("Route", DRAW.move);
export const Search = make("Search", DRAW.search);
export const Send = make("Send", DRAW.send);
export const Share = make("Share", DRAW.share);
export const Share2 = make("Share2", DRAW.share);
export const ShoppingBag = make("ShoppingBag", DRAW.bag);
export const Swords = make("Swords", DRAW.swords);
export const TrendingUp = make("TrendingUp", DRAW.up);
export const Trophy = make("Trophy", DRAW.trophy);
export const Undo2 = make("Undo2", DRAW.undo);
export const User = make("User", DRAW.user);
export const UserRound = make("UserRound", DRAW.user);
export const Users = make("Users", DRAW.club);
export const Zap = make("Zap", DRAW.bolt);
