"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(true)); // fail open on the notice only, not on auth itself
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.replace(params.get("next") || "/");
      router.refresh();
    } else {
      setError(data.error || "Wrong username or password.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-4"
      >
        <div className="text-accent font-extrabold text-2xl tracking-tight">VAULT</div>
        <h1 className="text-xl font-semibold text-white">Sign in</h1>

        {configured === false && (
          <div className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2 leading-relaxed">
            Login isn't set up yet. Add <code className="text-amber-200">USER_NAME</code> and{" "}
            <code className="text-amber-200">USER_PASSWORD</code> to your{" "}
            <code className="text-amber-200">.env</code> file, then restart the server.
          </div>
        )}

        <input
          type="text"
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white outline-none focus:border-red-600"
          placeholder="Username"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white outline-none focus:border-red-600"
          placeholder="Password"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !username || !password || configured === false}
          className="w-full rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
