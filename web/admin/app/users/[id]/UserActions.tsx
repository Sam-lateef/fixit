"use client";

import { useTransition } from "react";
import { banUser, unbanUser, deleteUser } from "./actions";

export function UserActions({
  id,
  banned,
  isSelf,
}: {
  id: string;
  banned: boolean;
  isSelf: boolean;
}): JSX.Element {
  const [pending, startTransition] = useTransition();

  const onDelete = (): void => {
    if (!window.confirm("Delete this user and all their posts, bids, and chats? This cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await deleteUser(id);
    });
  };

  return (
    <div className="flex gap-3">
      {banned ? (
        <button
          disabled={pending || isSelf}
          onClick={() => startTransition(() => unbanUser(id))}
          className="bg-green-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Unban
        </button>
      ) : (
        <button
          disabled={pending || isSelf}
          onClick={() => startTransition(() => banUser(id))}
          className="bg-yellow-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Ban
        </button>
      )}
      <button
        disabled={pending || isSelf}
        onClick={onDelete}
        className="bg-red-600 text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Delete
      </button>
      {isSelf ? (
        <span className="text-xs text-gray-500 self-center">
          (You can't ban or delete yourself.)
        </span>
      ) : null}
    </div>
  );
}
