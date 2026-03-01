import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useOutsideUiStore } from "@/store/useOutsideUiStore";

export function useOutsideScrollPersistence(routeKey) {
  const scrollRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      const offset = useOutsideUiStore.getState().scrollOffsets[routeKey] ?? 0;

      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo?.({ y: offset, animated: false });
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, [routeKey]),
  );

  const handleScroll = useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      useOutsideUiStore.getState().setScrollOffset(routeKey, y);
    },
    [routeKey],
  );

  return {
    scrollRef,
    handleScroll,
  };
}
