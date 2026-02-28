import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";

export const DEFAULT_CLUB_AVATAR =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&auto=format";

const INITIAL_FEED = [
  {
    id: "f1",
    user: "Nicki Minaj",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format",
    time: "2h ago",
    distance: 14.2,
    pace: "5:12",
    caption: "Morning grind never stops",
    likes: 18,
    comments: 4,
    liked: false,
  },
  {
    id: "f2",
    user: "Michel Jordan",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format",
    time: "5h ago",
    distance: 8.9,
    pace: "4:48",
    caption: "Trail run with the boys, can't beat it.",
    likes: 31,
    comments: 7,
    liked: true,
  },
  {
    id: "f3",
    user: "You",
    avatar: DEFAULT_CLUB_AVATAR,
    time: "Yesterday",
    distance: 21.1,
    pace: "5:30",
    caption: "Half marathon down!",
    likes: 42,
    comments: 12,
    liked: false,
  },
  {
    id: "f4",
    user: "Patrick Kluvert",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&auto=format",
    time: "2d ago",
    distance: 5.0,
    pace: "6:01",
    caption: "Back at it after the break.",
    likes: 9,
    comments: 2,
    liked: false,
  },
];

const createFeedPost = (payload) => ({
  id: `f${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  user: payload.user || "You",
  avatar: payload.avatar || DEFAULT_CLUB_AVATAR,
  time: "Just now",
  distance: Number(payload.distance || 0).toFixed(1),
  pace: payload.pace || "--:--",
  caption: payload.caption || "",
  likes: 0,
  comments: 0,
  liked: false,
});

export const useClubStore = create(
  persist(
    (set) => ({
      feed: INITIAL_FEED,

      addPost: (payload) =>
        set((state) => ({
          feed: [createFeedPost(payload), ...state.feed],
        })),

      addRunPost: (session) =>
        set((state) => ({
          feed: [
            createFeedPost({
              user: session.user,
              avatar: session.avatar,
              distance: session.distance,
              pace: session.pace,
              caption:
                session.caption ||
                `Finished ${Number(session.distance || 0).toFixed(2)} km.`,
            }),
            ...state.feed,
          ],
        })),

      toggleLike: (id) =>
        set((state) => ({
          feed: state.feed.map((item) => {
            if (!item || item.id !== id) return item;
            const isLiked = Boolean(item.liked);
            const likeCount = Number.isFinite(item.likes) ? item.likes : 0;
            return {
              ...item,
              liked: !isLiked,
              likes: Math.max(0, likeCount + (isLiked ? -1 : 1)),
            };
          }),
        })),

      addComment: (id) =>
        set((state) => ({
          feed: state.feed.map((item) => {
            if (!item || item.id !== id) return item;
            const commentCount = Number.isFinite(item.comments) ? item.comments : 0;
            return {
              ...item,
              comments: commentCount + 1,
            };
          }),
        })),
    }),
    {
      name: "club-feed",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ feed: state.feed }),
    },
  ),
);
