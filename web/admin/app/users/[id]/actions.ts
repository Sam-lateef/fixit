"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";

export async function banUser(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/users/${id}/ban`, { method: "POST" });
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
}

export async function unbanUser(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/users/${id}/unban`, { method: "POST" });
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
  redirect("/users");
}
