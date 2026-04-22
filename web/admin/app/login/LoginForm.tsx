"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/users";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-sm"
    >
      <h1 className="text-xl font-bold mb-6 text-gray-800">FixIt Admin</h1>
      <label className="block mb-4 text-sm">
        <span className="block mb-1 text-gray-600">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
          required
          autoFocus
        />
      </label>
      <label className="block mb-4 text-sm">
        <span className="block mb-1 text-gray-600">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-gray-900 text-white rounded py-2 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
