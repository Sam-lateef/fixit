import Link from "next/link";
import { Sidebar } from "../../../_components/Sidebar";
import { apiFetch } from "@/lib/api";
import { ThreadActions } from "./ThreadActions";

type Message = {
  id: string;
  senderId: string;
  content: string;
  hiddenAt: string | null;
  createdAt: string;
};

type ThreadResp = {
  thread: {
    id: string;
    lockedAt: string | null;
    bid: { post: { id: string }; shop: { name: string } };
  };
  messages: Message[];
};

export default async function ThreadDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let data: ThreadResp | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<ThreadResp>(`/api/v1/admin/threads/${params.id}/messages`);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl">
        <Link href="/chat/threads" className="text-sm text-blue-600 hover:underline">
          ← Back to chat threads
        </Link>
        {err || !data ? (
          <p className="text-red-600 text-sm mt-4">{err ?? "Not found"}</p>
        ) : (
          <>
            <div className="mt-4 mb-6">
              <h1 className="text-2xl font-bold">{data.thread.id}</h1>
              <p className="text-gray-500 text-sm">
                Shop: {data.thread.bid.shop.name} · {data.thread.lockedAt ? "LOCKED" : "ACTIVE"}
              </p>
            </div>
            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <ThreadActions
                threadId={data.thread.id}
                locked={Boolean(data.thread.lockedAt)}
                messages={data.messages.map((m) => ({ id: m.id, hiddenAt: m.hiddenAt }))}
              />
            </section>
            <section className="bg-white border border-gray-200 rounded p-6">
              <h2 className="font-semibold mb-4">Messages</h2>
              <ul className="divide-y divide-gray-100">
                {data.messages.map((m) => (
                  <li key={m.id} className="py-3 text-sm">
                    <p className="text-xs text-gray-500">
                      {m.senderId} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {m.hiddenAt ? "[Message hidden by moderation]" : m.content}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
