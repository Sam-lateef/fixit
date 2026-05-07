import { router, type Href } from "expo-router";
import { Alert } from "react-native";

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

export function confirmAndSubmitReport(
  t: (key: StringKey) => string,
  targetType: ReportTargetType,
  targetId: string,
): void {
  const promptTitle =
    targetType === "POST"
      ? t("reportPost")
      : targetType === "MESSAGE"
        ? t("reportMessage")
        : t("reportUser");
  Alert.alert(promptTitle, "", [
    { text: t("cancel"), style: "cancel" },
    {
      text: t("continue"),
      style: "default",
      onPress: () => {
        router.push({
          pathname: "/report" as Href,
          params: { targetType, targetId },
        } as never);
      },
    },
  ]);
}
