import Link from "next/link";
import { Sidebar } from "../_components/Sidebar";
import { apiFetch } from "@/lib/api";

type PostRow = {
  id: string;
  serviceType: "REPAIR" | "PARTS" | "TOWING";
  title: string | null;
  description: string;
  status: "ACTIVE" | "ACCEPTED" | "EXPIRED" | "DELETED";
  createdAt: string;
  carMake: string | null;
  carModel: string | null;
  user: { id: string; name: string | null; phone: string | null };
  _count: { bids: number };
};

type ListResponse = { posts: PostRow[]; nextCursor: string | null };

function statusPill(status: PostRow["status"]): JSX.Element {
  const styles: Record<PostRow["status"], string> = {
    ACTIVE: "bg-green-100 text-green-700",
    ACCEPTED: "bg-blue-100 text-blue-700",
    EXPIRED: "bg-gray-100 text-gray-700",
    DELETED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; serviceType?: string; userId?: string };
}): Promise<JSX.Element> {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.serviceType) params.set("serviceType", searchParams.serviceType);
  if (searchParams.userId) params.set("userId", searchParams.userId);

  let data: ListResponse | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<ListResponse>(`/api/v1/admin/posts?${params.toString()}`);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Posts</h1>

        <form className="flex gap-3 mb-6" method="GET">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search title, description, make…"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select
            name="serviceType"
            defaultValue={searchParams.serviceType ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="REPAIR">Repair</option>
            <option value="PARTS">Parts</option>
            <option value="TOWING">Towing</option>
          </select>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="EXPIRED">Expired</option>
            <option value="DELETED">Deleted</option>
          </select>
          {searchParams.userId ? (
            <input type="hidden" name="userId" value={searchParams.userId} />
          ) : null}
          <button className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-semibold">
            Filter
          </button>
        </form>

        {searchParams.userId ? (
          <div className="mb-4 text-sm">
            Filtered to user{" "}
            <Link
              href={`/users/${searchParams.userId}`}
              className="text-blue-600 hover:underline"
            >
              {searchParams.userId}
            </Link>
            {" · "}
            <Link href="/posts" className="text-gray-500 hover:underline">
              clear
            </Link>
          </div>
        ) : null}

        {err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Title / Description</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Bids</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.posts.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 max-w-md">
                      <Link href={`/posts/${p.id}`} className="text-blue-600 hover:underline">
                        {p.title ?? p.description.slice(0, 60)}
                      </Link>
                      {p.carMake ? (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[p.carMake, p.carModel].filter(Boolean).join(" · ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">{p.serviceType}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/users/${p.user.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.user.name ?? p.user.phone ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p._count.bids}</td>
                    <td className="px-4 py-2">{statusPill(p.status)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data && data.posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No posts found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
