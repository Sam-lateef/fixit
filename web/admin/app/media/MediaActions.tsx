"use client";

import { useTransition } from "react";
import { hideMedia, restoreMedia } from "./actions";

export function MediaActions({
  id,
  status,
}: {
  id: string;
  status: "ACTIVE" | "HIDDEN" | "REMOVED";
}): JSX.Element {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        className="border rounded px-2 py-1 text-xs"
        disabled={pending || status !== "ACTIVE"}
        onClick={() => startTransition(() => hideMedia(id))}
      >
        Hide
      </button>
      <button
        className="border rounded px-2 py-1 text-xs"
        disabled={pending || status === "ACTIVE"}
        onClick={() => startTransition(() => restoreMedia(id))}
      >
        Restore
      </button>
    </div>
  );
}
