import Link from "next/link";
import { Sidebar } from "../_components/Sidebar";
import { apiFetch } from "@/lib/api";

type ReportRow = {
  id: string;
  targetType: "USER" | "POST" | "MESSAGE";
  targetId: string;
  reason: string;
  status: "OPEN" | "IN_REVIEW" | "ACTION_TAKEN" | "DISMISSED" | "DUPLICATE";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  createdAt: string;
  reporter: { id: string; name: string | null; email: string | null; phone: string | null };
};

type ListResponse = { reports: ReportRow[]; nextCursor: string | null };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    targetType?: string;
    reason?: string;
    priority?: string;
  };
}): Promise<JSX.Element> {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.targetType) params.set("targetType", searchParams.targetType);
  if (searchParams.reason) params.set("reason", searchParams.reason);
  if (searchParams.priority) params.set("priority", searchParams.priority);

  let data: ListResponse | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<ListResponse>(`/api/v1/admin/reports?${params.toString()}`);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        <form className="flex gap-3 mb-6" method="GET">
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Any status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="ACTION_TAKEN">ACTION_TAKEN</option>
            <option value="DISMISSED">DISMISSED</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </select>
          <select
            name="targetType"
            defaultValue={searchParams.targetType ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Any target</option>
            <option value="USER">USER</option>
            <option value="POST">POST</option>
            <option value="MESSAGE">MESSAGE</option>
          </select>
          <select
            name="priority"
            defaultValue={searchParams.priority ?? ""}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="">Any priority</option>
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
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
                  <th className="px-4 py-2">Report</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Reporter</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.reports.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/reports/${r.id}`} className="text-blue-600 hover:underline">
                        {r.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.targetType}</td>
                    <td className="px-4 py-2">{r.reason}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">
                      {r.reporter.name ?? r.reporter.email ?? r.reporter.phone ?? r.reporter.id}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data && data.reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No reports found.
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
