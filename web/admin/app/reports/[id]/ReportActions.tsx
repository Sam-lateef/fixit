"use client";

import { useTransition } from "react";
import { claimReport, moderateReportedTarget, releaseReport, resolveReport } from "./actions";

export function ReportActions({
  id,
  status,
  assigneeId,
  myId,
  targetType,
  targetId,
  reason,
  details,
}: {
  id: string;
  status: string;
  assigneeId: string | null;
  myId: string;
  targetType: "USER" | "POST" | "MESSAGE";
  targetId: string;
  reason: string;
  details: string | null;
}): JSX.Element {
  const [pending, startTransition] = useTransition();
  const actionLabel =
    targetType === "USER"
      ? "Ban user now"
      : targetType === "POST"
        ? "Takedown post now"
        : "Hide message now";
  const confirmMessage =
    targetType === "USER"
      ? "Ban this user now? This will immediately restrict account access."
      : targetType === "POST"
        ? "Takedown this post now? It will be removed from normal visibility."
        : "Hide this message now? It will be masked in chat.";
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        className="bg-gray-900 text-white rounded px-3 py-1 text-sm"
        disabled={pending}
        onClick={() => startTransition(() => claimReport(id))}
      >
        {assigneeId === myId ? "Claimed by you" : "Claim"}
      </button>
      <button
        className="border rounded px-3 py-1 text-sm"
        disabled={pending}
        onClick={() => startTransition(() => releaseReport(id))}
      >
        Release
      </button>
      <button
        className="bg-red-600 text-white rounded px-3 py-1 text-sm"
        disabled={pending || status === "ACTION_TAKEN"}
        onClick={() => {
          if (!window.confirm(confirmMessage)) {
            return;
          }
          startTransition(() =>
            moderateReportedTarget({
              reportId: id,
              targetType,
              targetId,
              reason,
              notes: details,
            }),
          );
        }}
      >
        {actionLabel}
      </button>
      <button
        className="border rounded px-3 py-1 text-sm"
        disabled={pending || status === "ACTION_TAKEN"}
        onClick={() => startTransition(() => resolveReport(id, "ACTION_TAKEN"))}
      >
        Mark action taken
      </button>
      <button
        className="border rounded px-3 py-1 text-sm"
        disabled={pending || status === "DISMISSED"}
        onClick={() => startTransition(() => resolveReport(id, "DISMISSED"))}
      >
        Dismiss
      </button>
      <button
        className="border rounded px-3 py-1 text-sm"
        disabled={pending || status === "DUPLICATE"}
        onClick={() => startTransition(() => resolveReport(id, "DUPLICATE"))}
      >
        Mark duplicate
      </button>
    </div>
  );
}
