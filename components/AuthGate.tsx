"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sprig } from "@/components/Leaf";

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
      <main className="p-6 text-sm text-ink-soft">読み込み中...</main>
    );
  }

  if (!session) {
    return (
      <main>
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <Sprig className="h-40 w-32 text-leaf" />
          <h1 className="mt-4 font-serif text-4xl tracking-widest">おかいも</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            バイト生活のための、
            <br />
            やさしいお金の記録
          </p>
          <button
            type="button"
            onClick={handleLogin}
            className="mt-10 w-full rounded-2xl bg-leaf py-3 font-medium text-white shadow-sm transition hover:bg-leaf-dark active:scale-[0.99]"
          >
            Googleでログイン
          </button>
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}