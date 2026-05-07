import Link from "next/link";
import { Sidebar } from "../../_components/Sidebar";
import { apiFetch } from "@/lib/api";
import { ReportActions } from "./ReportActions";

type ReportDetail = {
  id: string;
  targetType: "USER" | "POST" | "MESSAGE";
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  createdAt: string;
  reporter: { id: string; name: string | null; phone: string | null; email: string | null };
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  notes: string | null;
};

type Resp = { report: ReportDetail; audit: AuditLog[] };
type TargetContext = { id: string; threadId: string } | null;
type RespWithContext = { report: ReportDetail; audit: AuditLog[]; targetContext: TargetContext };
type MeResp = { user: { id: string } };

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let data: RespWithContext | null = null;
  let me: MeResp | null = null;
  let err: string | null = null;
  try {
    [data, me] = await Promise.all([
      apiFetch<RespWithContext>(`/api/v1/admin/reports/${params.id}`),
      apiFetch<MeResp>("/api/v1/admin/auth/me"),
    ]);
  } catch (e) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">
          ← Back to reports
        </Link>
        {err || !data || !me ? (
          <p className="text-red-600 text-sm mt-4">{err ?? "Not found"}</p>
        ) : (
          <>
            <div className="mt-4 mb-6">
              <h1 className="text-2xl font-bold">{data.report.id}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {data.report.targetType} · {data.report.reason} · {data.report.status}
              </p>
            </div>

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-3">Actions</h2>
              <ReportActions
                id={data.report.id}
                status={data.report.status}
                assigneeId={data.report.assigneeId}
                myId={me.user.id}
                targetType={data.report.targetType}
                targetId={data.report.targetId}
                reason={data.report.reason}
                details={data.report.details}
              />
            </section>

            <section className="bg-white border border-gray-200 rounded p-6 mb-6">
              <h2 className="font-semibold mb-3">Context</h2>
              <p className="text-sm">Target: {data.report.targetType} / {data.report.targetId}</p>
              <div className="text-sm mt-2 flex gap-3 flex-wrap">
                {data.report.targetType === "USER" ? (
                  <Link href={`/users/${data.report.targetId}`} className="text-blue-600 hover:underline">
                    Open reported user
                  </Link>
                ) : null}
                {data.report.targetType === "POST" ? (
                  <Link href={`/posts/${data.report.targetId}`} className="text-blue-600 hover:underline">
                    Open reported post
                  </Link>
                ) : null}
                {data.report.targetType === "MESSAGE" && data.targetContext?.threadId ? (
                  <Link
                    href={`/chat/threads/${data.targetContext.threadId}`}
                    className="text-blue-600 hover:underline"
                  >
                    Open reported chat thread
                  </Link>
                ) : null}
              </div>
              <p className="text-sm">Priority: {data.report.priority}</p>
              <p className="text-sm">
                Reporter:{" "}
                {data.report.reporter.name ??
                  data.report.reporter.email ??
                  data.report.reporter.phone ??
                  data.report.reporter.id}
              </p>
              {data.report.details ? (
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                  {data.report.details}
                </p>
              ) : null}
            </section>

            <section className="bg-white border border-gray-200 rounded p-6">
              <h2 className="font-semibold mb-3">Recent audit</h2>
              {data.audit.length === 0 ? (
                <p className="text-sm text-gray-500">No audit events.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.audit.map((a) => (
                    <li key={a.id} className="py-3 text-sm">
                      <p className="font-medium">{a.action}</p>
                      <p className="text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
                      {a.notes ? <p className="text-gray-700 mt-1">{a.notes}</p> : null}
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
