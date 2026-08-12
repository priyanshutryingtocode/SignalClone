"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-signal-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-signal-border bg-signal-panel p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-accent text-2xl font-bold">
            S
          </div>
          <h1 className="text-xl font-semibold text-signal-text">Sign in to Signal Clone</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-signal-subtext">Phone number or username</label>
            <input
              className="w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-signal-text outline-none focus:border-signal-accent"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+1 555 0100 or alice"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-signal-subtext">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-signal-text outline-none focus:border-signal-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-signal-accent px-4 py-2 font-medium text-white transition hover:bg-signal-accentHover disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-signal-subtext">
          New here?{" "}
          <Link href="/register" className="text-signal-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
