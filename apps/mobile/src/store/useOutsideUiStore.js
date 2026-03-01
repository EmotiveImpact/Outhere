import { create } from "zustand";

export const useOutsideUiStore = create((set) => ({
  scrollOffsets: {
    arena: 0,
    events: 0,
    drops: 0,
    news: 0,
  },
  setScrollOffset: (route, offset) =>
    set((state) => {
      const nextOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
      const currentOffset = state.scrollOffsets[route] ?? 0;

      if (Math.abs(currentOffset - nextOffset) < 2) {
        return state;
      }

      return {
        scrollOffsets: {
          ...state.scrollOffsets,
          [route]: nextOffset,
        },
      };
    }),
}));
