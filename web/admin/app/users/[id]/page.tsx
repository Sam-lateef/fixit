import Link from "next/link";
import { Sidebar } from "../../_components/Sidebar";
import { apiFetch } from "@/lib/api";
import { UserActions } from "./UserActions";

type UserDetail = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  userType: "OWNER" | "SHOP";
  role: "USER" | "ADMIN";
  bannedAt: string | null;
  createdAt: string;
  city: string | null;
  address: string | null;
  shop: { id: string; name: string } | null;
};

type Resp = {
  user: UserDetail;
  counts: { posts: number; bids: number };
};

type MeResp = { user: { id: string } };

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let data: Resp | null = null;
  let me: MeResp | null = null;
  let err: string | null = null;
  try {
    [data, me] = await Promise.all([
      apiFetch<Resp>(`/api/v1/admin/users/${params.id}`),
      apiFetch<MeResp>(`/api/v1/admin/auth/me`),
    ]);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <Link href="/users" className="text-sm text-blue-600 hover:underline">
          ← Back to users
        </Link>

        {err || !data ? (
          <p className="text-red-600 text-sm mt-4">{err ?? "Not found"}</p>
        ) : (
          <>
            <div className="flex items-start justify-between mt-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold">{data.user.name ?? "—"}</h1>
                <p className="text-gray-500 mt-1">
                  {data.user.userType} · joined{" "}
                  {new Date(data.user.createdAt).toLocaleDateString()}
                </p>
                {data.user.bannedAt ? (
                  <p className="text-red-600 text-sm mt-2">
                    Banned on {new Date(data.user.bannedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <UserActions
                id={data.user.id}
                banned={Boolean(data.user.bannedAt)}
                isSelf={me?.user.id === data.user.id}
              />
            </div>

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-4">Contact</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-gray-500">Phone</dt>
                <dd>{data.user.phone ?? "—"}</dd>
                <dt className="text-gray-500">Email</dt>
                <dd>{data.user.email ?? "—"}</dd>
                <dt className="text-gray-500">City</dt>
                <dd>{data.user.city ?? "—"}</dd>
                <dt className="text-gray-500">Address</dt>
                <dd>{data.user.address ?? "—"}</dd>
                <dt className="text-gray-500">Role</dt>
                <dd>{data.user.role}</dd>
              </dl>
            </section>

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-4">Activity</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-gray-500">Posts</dt>
                <dd>
                  <Link
                    href={`/posts?userId=${data.user.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {data.counts.posts}
                  </Link>
                </dd>
                <dt className="text-gray-500">Bids</dt>
                <dd>{data.counts.bids}</dd>
                {data.user.shop ? (
                  <>
                    <dt className="text-gray-500">Shop</dt>
                    <dd>{data.user.shop.name}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
