import { Sidebar } from "../_components/Sidebar";
import { apiFetch } from "@/lib/api";

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
};

type Resp = { logs: AuditRow[]; nextCursor: string | null };

export default async function AuditPage(): Promise<JSX.Element> {
  let data: Resp | null = null;
  let err: string | null = null;
  try {
    data = await apiFetch<Resp>("/api/v1/admin/audit-logs");
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Audit Log</h1>
        {err ? <p className="text-red-600 text-sm">{err}</p> : null}
        <div className="bg-white border border-gray-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{log.action}</td>
                  <td className="px-4 py-2">
                    {log.targetType}/{log.targetId}
                  </td>
                  <td className="px-4 py-2">{log.reason ?? "—"}</td>
                  <td className="px-4 py-2">{log.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
