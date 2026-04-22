import Link from "next/link";
import { Sidebar } from "../_components/Sidebar";
import { apiFetch } from "@/lib/api";

type UserRow = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  userType: "OWNER" | "SHOP";
  role: "USER" | "ADMIN";
  bannedAt: string | null;
  createdAt: string;
};

type ListResponse = {
  users: UserRow[];
  nextCursor: string | null;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; userType?: string; status?: string };
}): Promise<JSX.Element> {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.userType) params.set("userType", searchParams.userType);
  if (searchParams.status) params.set("status", searchParams.status);

  let data: ListResponse | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<ListResponse>(`/api/v1/admin/users?${params.toString()}`);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Users</h1>

        <form className="flex gap-3 mb-6" method="GET">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search phone, email, name…"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select
            name="userType"
            defaultValue={searchParams.userType ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="OWNER">Owner</option>
            <option value="SHOP">Shop</option>
          </select>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <button className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-semibold">
            Filter
          </button>
        </form>

        {err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/users/${u.id}`} className="text-blue-600 hover:underline">
                        {u.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{u.phone ?? "—"}</td>
                    <td className="px-4 py-2">{u.email ?? "—"}</td>
                    <td className="px-4 py-2">{u.userType}</td>
                    <td className="px-4 py-2">
                      {u.role === "ADMIN" ? (
                        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u.bannedAt ? (
                        <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Banned
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {data && data.users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No users found.
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
