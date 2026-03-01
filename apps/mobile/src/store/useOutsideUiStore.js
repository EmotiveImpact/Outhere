import { create } from "zustand";

export const useOutsideUiStore = create((set) => ({
  scrollOffsets: {
    arena: 0,
    events: 0,
    drops: 0,
    news: 0,
  },
  eventsRsvpdIds: [],
  eventsRsvpCounts: {},
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
  setEventRsvp: (eventId, isRsvpd) =>
    set((state) => {
      const current = Array.isArray(state.eventsRsvpdIds) ? state.eventsRsvpdIds : [];
      const hasEvent = current.includes(eventId);

      if (isRsvpd && !hasEvent) {
        return { eventsRsvpdIds: [...current, eventId] };
      }

      if (!isRsvpd && hasEvent) {
        return { eventsRsvpdIds: current.filter((id) => id !== eventId) };
      }

      return state;
    }),
  setEventRsvpCount: (eventId, count) =>
    set((state) => ({
      eventsRsvpCounts: {
        ...state.eventsRsvpCounts,
        [eventId]: Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0,
      },
    })),
}));
