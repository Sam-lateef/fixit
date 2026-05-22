import { router, type Href } from "expo-router";

import { apiFetch } from "./api";
import type { StringKey } from "./strings";

type ReportTargetType = "POST" | "MESSAGE" | "USER";

export async function submitReport(
  targetType: ReportTargetType,
  targetId: string,
  details: string,
): Promise<void> {
  await apiFetch("/api/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      targetType,
      targetId,
      reason: "OTHER",
      details,
    }),
  });
}

/**
 * Navigate directly to the report screen. The previous confirmation
 * `Alert.alert` step rendered as an empty title+buttons dialog on Android
 * (the message body was always blank) and just added friction.
 *
 * The `t` argument is kept for backwards compat with call sites that
 * passed the i18n function; it is intentionally unused here.
 */
export function confirmAndSubmitReport(
  _t: (key: StringKey) => string,
  targetType: ReportTargetType,
  targetId: string,
): void {
  router.push({
    pathname: "/report" as Href,
    params: { targetType, targetId },
  } as never);
}
