import Link from "next/link";
import { Sidebar } from "../../_components/Sidebar";
import { apiFetch } from "@/lib/api";
import { TakedownButton } from "./TakedownButton";

type Bid = {
  id: string;
  priceEstimate: number;
  message: string | null;
  status: string;
  createdAt: string;
  shop: { id: string; name: string };
};

type PostDetail = {
  id: string;
  serviceType: "REPAIR" | "PARTS" | "TOWING";
  title: string | null;
  description: string;
  status: "ACTIVE" | "ACCEPTED" | "EXPIRED" | "DELETED";
  createdAt: string;
  expiresAt: string;
  carMake: string | null;
  carModel: string | null;
  carYear: number | null;
  repairCategory: string | null;
  partsCategory: string | null;
  photoUrls: string[];
  user: { id: string; name: string | null; phone: string | null; email: string | null };
  district: { name: string; city: string } | null;
  bids: Bid[];
};

type Resp = { post: PostDetail };

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let data: Resp | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<Resp>(`/api/v1/admin/posts/${params.id}`);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <Link href="/posts" className="text-sm text-blue-600 hover:underline">
          ← Back to posts
        </Link>

        {err || !data ? (
          <p className="text-red-600 text-sm mt-4">{err ?? "Not found"}</p>
        ) : (
          <>
            <div className="flex items-start justify-between mt-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {data.post.title ?? data.post.serviceType}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                  {data.post.serviceType} · {data.post.status} · posted{" "}
                  {new Date(data.post.createdAt).toLocaleString()}
                </p>
              </div>
              <TakedownButton
                id={data.post.id}
                disabled={data.post.status === "DELETED"}
              />
            </div>

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-3">Details</h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">
                {data.post.description}
              </p>
              {data.post.carMake || data.post.carYear ? (
                <p className="text-sm text-gray-600 mt-3">
                  {[data.post.carMake, data.post.carModel, data.post.carYear]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {data.post.district ? (
                <p className="text-sm text-gray-600 mt-1">
                  {data.post.district.city} · {data.post.district.name}
                </p>
              ) : null}
            </section>

            {data.post.photoUrls.length > 0 ? (
              <section className="bg-white border border-gray-200 rounded p-6 mb-6">
                <h2 className="font-semibold mb-3">Photos</h2>
                <div className="flex gap-3 flex-wrap">
                  {data.post.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url.trim()}
                      alt=""
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-3">Posted by</h2>
              <Link
                href={`/users/${data.post.user.id}`}
                className="text-blue-600 hover:underline"
              >
                {data.post.user.name ?? data.post.user.phone ?? data.post.user.email ?? data.post.user.id}
              </Link>
            </section>

            <section className="bg-white border border-gray-200 rounded p-6">
              <h2 className="font-semibold mb-3">Bids ({data.post.bids.length})</h2>
              {data.post.bids.length === 0 ? (
                <p className="text-sm text-gray-500">No bids yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.post.bids.map((b) => (
                    <li key={b.id} className="py-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{b.shop.name}</span>
                        <span className="text-gray-600">
                          {b.priceEstimate.toLocaleString()} IQD
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {b.status} · {new Date(b.createdAt).toLocaleString()}
                      </div>
                      {b.message ? (
                        <p className="text-gray-700 mt-1">{b.message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
