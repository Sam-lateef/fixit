"use client";

import { useTransition } from "react";
import { lockThread, unlockThread, hideMessage, unhideMessage } from "./actions";

type MessageRow = {
  id: string;
  hiddenAt: string | null;
};

export function ThreadActions({
  threadId,
  locked,
  messages,
}: {
  threadId: string;
  locked: boolean;
  messages: MessageRow[];
}): JSX.Element {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className="bg-gray-900 text-white rounded px-3 py-1 text-sm"
          disabled={pending || locked}
          onClick={() => startTransition(() => lockThread(threadId))}
        >
          Lock thread
        </button>
        <button
          className="border rounded px-3 py-1 text-sm"
          disabled={pending || !locked}
          onClick={() => startTransition(() => unlockThread(threadId))}
        >
          Unlock thread
        </button>
      </div>
      <div className="text-sm text-gray-600">
        Moderate messages from the controls beside each row.
      </div>
      {messages.map((m) => (
        <div key={m.id} className="flex gap-2">
          <button
            className="border rounded px-2 py-1 text-xs"
            disabled={pending || Boolean(m.hiddenAt)}
            onClick={() => startTransition(() => hideMessage(m.id))}
          >
            Hide
          </button>
          <button
            className="border rounded px-2 py-1 text-xs"
            disabled={pending || !m.hiddenAt}
            onClick={() => startTransition(() => unhideMessage(m.id))}
          >
            Unhide
          </button>
        </div>
      ))}
    </div>
  );
}
