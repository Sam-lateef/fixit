"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";

export async function hideMedia(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/media/${id}/hide`, {
    method: "POST",
    body: JSON.stringify({ reason: "OTHER" }),
  });
  revalidatePath("/media");
}

export async function restoreMedia(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/media/${id}/restore`, { method: "POST" });
  revalidatePath("/media");
}
