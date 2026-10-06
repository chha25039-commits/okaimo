"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError("ログインに失敗しました: " + error.message);
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-zinc-50 p-4 text-zinc-500">
        読み込み中...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-md p-4 pt-24 text-center">
          <h1 className="text-2xl font-bold">おかいも</h1>
          <p className="mt-2 text-sm text-zinc-500">
            ログインして、自分の記録を見る
          </p>
          <button
            type="button"
            onClick={handleLogin}
            className="mt-6 w-full rounded-lg bg-zinc-900 p-3 font-bold text-white"
          >
            Googleでログイン
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}