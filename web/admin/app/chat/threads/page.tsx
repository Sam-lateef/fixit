import Link from "next/link";
import { Sidebar } from "../../_components/Sidebar";
import { apiFetch } from "@/lib/api";

type Thread = {
  id: string;
  lockedAt: string | null;
  bid: {
    post: { id: string; description: string };
    shop: { id: string; name: string };
  };
  messages: Array<{ id: string; content: string; createdAt: string }>;
};

type Resp = { threads: Thread[]; nextCursor: string | null };

export default async function AdminThreadsPage(): Promise<JSX.Element> {
  let data: Resp | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<Resp>("/api/v1/admin/threads");
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Chat Threads</h1>
        {err ? <p className="text-red-600 text-sm">{err}</p> : null}
        <div className="bg-white border border-gray-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Thread</th>
                <th className="px-4 py-2">Shop</th>
                <th className="px-4 py-2">Last message</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.threads.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/chat/threads/${t.id}`} className="text-blue-600 hover:underline">
                      {t.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{t.bid.shop.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {t.messages[0]?.content?.slice(0, 80) ?? "—"}
                  </td>
                  <td className="px-4 py-2">{t.lockedAt ? "LOCKED" : "ACTIVE"}</td>
                </tr>
              ))}
              {data && data.threads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No threads found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
