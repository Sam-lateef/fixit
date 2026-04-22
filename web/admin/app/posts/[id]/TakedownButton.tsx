"use client";

import { useTransition } from "react";
import { takedownPost } from "./actions";

export function TakedownButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}): JSX.Element {
  const [pending, startTransition] = useTransition();

  const onClick = (): void => {
    if (!window.confirm("Take down this post? This will set its status to DELETED.")) {
      return;
    }
    startTransition(async () => {
      await takedownPost(id);
    });
  };

  return (
    <button
      disabled={disabled || pending}
      onClick={onClick}
      className="bg-red-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
    >
      Take down
    </button>
  );
}
