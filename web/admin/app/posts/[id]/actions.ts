"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";

export async function takedownPost(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/posts/${id}`, { method: "DELETE" });
  revalidatePath(`/posts/${id}`);
  revalidatePath("/posts");
  redirect("/posts");
}
