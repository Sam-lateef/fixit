"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function claimReport(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/reports/${id}/claim`, { method: "POST" });
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
}

export async function releaseReport(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/reports/${id}/release`, { method: "POST" });
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
}

export async function resolveReport(
  id: string,
  decision: "ACTION_TAKEN" | "DISMISSED" | "DUPLICATE",
): Promise<void> {
  await apiFetch(`/api/v1/admin/reports/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
}

export async function moderateReportedTarget(input: {
  reportId: string;
  targetType: "USER" | "POST" | "MESSAGE";
  targetId: string;
  reason?: string;
  notes?: string | null;
}): Promise<void> {
  const body = JSON.stringify({
    reason: input.reason,
    notes: input.notes ?? undefined,
  });
  if (input.targetType === "USER") {
    await apiFetch(`/api/v1/admin/users/${input.targetId}/ban`, {
      method: "POST",
      body,
    });
  } else if (input.targetType === "POST") {
    await apiFetch(`/api/v1/admin/posts/${input.targetId}`, {
      method: "DELETE",
      body,
    });
  } else {
    await apiFetch(`/api/v1/admin/messages/${input.targetId}/hide`, {
      method: "POST",
      body,
    });
  }
  await resolveReport(input.reportId, "ACTION_TAKEN");
  revalidatePath(`/reports/${input.reportId}`);
}
