import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

/**
 * Poll while a screen is focused (e.g. owner waiting on new bids).
 * Complements push-driven refetch when foreground listeners are unreliable.
 */
export function usePollWhileFocused(
  refetch: () => void | Promise<void>,
  intervalMs: number,
): void {
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => {
        void refetch();
      }, intervalMs);
      return () => clearInterval(id);
    }, [refetch, intervalMs]),
  );
}
