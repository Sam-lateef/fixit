import { Sidebar } from "../_components/Sidebar";
import { apiFetch } from "@/lib/api";
import { MediaActions } from "./MediaActions";

type MediaRow = {
  id: string;
  key: string;
  url: string;
  status: "ACTIVE" | "HIDDEN" | "REMOVED";
  createdAt: string;
};

type Resp = { media: MediaRow[]; nextCursor: string | null };

function toAdminMediaSrc(row: MediaRow): string {
  const key = row.key.trim();
  if (key.startsWith("posts/")) {
    return `/api/media/${key}`;
  }
  return row.url;
}

export default async function MediaPage(): Promise<JSX.Element> {
  let data: Resp | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<Resp>("/api/v1/admin/media");
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Media</h1>
        {err ? <p className="text-red-600 text-sm">{err}</p> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.media.map((m) => (
            <article key={m.id} className="bg-white border border-gray-200 rounded p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toAdminMediaSrc(m)}
                alt=""
                className="w-full h-36 object-cover rounded border border-gray-100"
              />
              <div className="mt-3 text-xs text-gray-500 break-all">{m.key}</div>
              <div className="mt-1 text-sm">Status: {m.status}</div>
              <div className="mt-1 text-xs text-gray-500">
                {new Date(m.createdAt).toLocaleString()}
              </div>
              <div className="mt-3">
                <MediaActions id={m.id} status={m.status} />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
