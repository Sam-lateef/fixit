"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function hideMessage(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/messages/${id}/hide`, {
    method: "POST",
    body: JSON.stringify({ reason: "HARASSMENT" }),
  });
}

export async function unhideMessage(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/messages/${id}/unhide`, { method: "POST" });
}

export async function lockThread(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/threads/${id}/lock`, {
    method: "POST",
    body: JSON.stringify({ reason: "HARASSMENT" }),
  });
  revalidatePath(`/chat/threads/${id}`);
  revalidatePath("/chat/threads");
}

export async function unlockThread(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/threads/${id}/unlock`, { method: "POST" });
  revalidatePath(`/chat/threads/${id}`);
  revalidatePath("/chat/threads");
}
