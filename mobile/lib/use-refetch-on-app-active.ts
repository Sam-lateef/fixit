import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Refetch when the app returns to the foreground. Tab screens that stay mounted
 * while backgrounded do not re-run useFocusEffect — this covers notification
 * taps and resume-from-home without a navigation change.
 */
export function useRefetchOnAppActive(refetch: () => void | Promise<void>): void {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refetch();
      }
    });
    return () => sub.remove();
  }, [refetch]);
}
