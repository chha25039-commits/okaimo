"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMonthKey, prevMonthKey, yen } from "@/lib/money";

export default function SettingsPage() {
  const [savingsInput, setSavingsInput] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [incomeInput, setIncomeInput] = useState("");
  const [savingsNote, setSavingsNote] = useState("");
  const [budgetNote, setBudgetNote] = useState("");
  const [incomeNote, setIncomeNote] = useState("");
  const [hasSettings, setHasSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const now = new Date();
    const thisKey = getMonthKey(now);
    const prevKey = prevMonthKey(now);

    const { data: bs, error: bError } = await supabase
      .from("budgets")
      .select("month, amount")
      .in("month", [thisKey, prevKey]);
    if (bError) {
      setError("予算の読み込みに失敗しました: " + bError.message);
    } else {
      const map: Record<string, number> = {};
      for (const b of bs ?? []) map[b.month] = b.amount;
      if (thisKey in map) {
        setBudgetInput(String(map[thisKey]));
        setBudgetNote("");
      } else if (prevKey in map) {
        setBudgetInput(String(map[prevKey]));
        setBudgetNote(
          "先月の金額が入っています。「設定」を押すと今月の予算になります"
        );
      } else {
        setBudgetNote("今月の予算はまだ設定されていません");
      }
    }

    const { data: inc, error: iError } = await supabase
      .from("monthly_incomes")
      .select("amount")
      .eq("month", thisKey)
      .maybeSingle();
    if (iError) {
      setError("給料の読み込みに失敗しました: " + iError.message);
    } else if (inc) {
      setIncomeInput(String(inc.amount));
      setIncomeNote("");
    } else {
      setIncomeNote("今月の給料はまだ入力されていません");
    }

    const { data: s, error: sError } = await supabase
      .from("settings")
      .select("initial_savings, savings_start_at")
      .maybeSingle();
    if (sError) {
      setError("設定の読み込みに失敗しました: " + sError.message);
    } else if (s) {
      setHasSettings(true);
      setSavingsNote(
        `登録中: ${yen(s.initial_savings)}(${new Date(
          s.savings_start_at
        ).toLocaleString("ja-JP")} から数えています)`
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSavingsSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const value = Number(savingsInput);
    if (savingsInput.trim() === "" || !Number.isInteger(value) || value < 0) {
      setError("貯金額は0以上の整数で入力してください");
      return;
    }
    setError("");
    const { error } = hasSettings
      ? await supabase
          .from("settings")
          .update({ initial_savings: value })
          .eq("id", 1)
      : await supabase.from("settings").insert({ id: 1, initial_savings: value });
    if (error) {
      setError("貯金額の保存に失敗しました: " + error.message);
      return;
    }
    setSavingsInput("");
    setMessage("最初の貯金を保存しました");
    await load();
  }

  async function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const value = Number(budgetInput);
    if (budgetInput.trim() === "" || !Number.isInteger(value) || value < 0) {
      setError("予算は0以上の整数で入力してください");
      return;
    }
    setError("");
    const { error } = await supabase
      .from("budgets")
      .upsert({ month: getMonthKey(new Date()), amount: value });
    if (error) {
      setError("予算の保存に失敗しました: " + error.message);
      return;
    }
    setMessage("今月の予算を保存しました");
    await load();
  }

  async function handleIncomeSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const value = Number(incomeInput);
    if (incomeInput.trim() === "" || !Number.isInteger(value) || value < 0) {
      setError("給料は0以上の整数で入力してください");
      return;
    }
    setError("");
    const { error } = await supabase
      .from("monthly_incomes")
      .upsert({ month: getMonthKey(new Date()), amount: value });
    if (error) {
      setError("給料の保存に失敗しました: " + error.message);
      return;
    }
    setMessage("今月の給料を保存しました");
    await load();
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-md p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">設定</h1>
          <Link href="/" className="text-sm text-zinc-600 underline">
            戻る
          </Link>
        </div>

        <form
          onSubmit={handleIncomeSave}
          className="mt-4 rounded-xl bg-white p-4 shadow"
        >
          <p className="font-bold">今月の給料</p>
          <p className="mt-1 text-xs text-zinc-500">
            今月入る(入った)給料の額です。月ごとに入れます
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="円"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 p-2"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-900 px-4 font-bold"
            >
              設定
            </button>
          </div>
          {incomeNote && (
            <p className="mt-2 text-xs text-zinc-500">{incomeNote}</p>
          )}
        </form>

        <form
          onSubmit={handleBudgetSave}
          className="mt-4 rounded-xl bg-white p-4 shadow"
        >
          <p className="font-bold">今月の予算</p>
          <p className="mt-1 text-xs text-zinc-500">
            全財産のうち、今月使っていい金額です。月ごとに入れます
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="円"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 p-2"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-900 px-4 font-bold"
            >
              設定
            </button>
          </div>
          {budgetNote && (
            <p className="mt-2 text-xs text-zinc-500">{budgetNote}</p>
          )}
        </form>

        <form
          onSubmit={handleSavingsSave}
          className="mt-4 rounded-xl bg-white p-4 shadow"
        >
          <p className="font-bold">最初の貯金</p>
          <p className="mt-1 text-xs text-zinc-500">
            使い始めたときの貯金額です。最初に1回だけ入れます。入力ミスを直したいときだけ、入れ直してください。
            始めた月の給料がすでにこの貯金に入っている場合は、その月の給料は入力しないでください
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="円"
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 p-2"
            />
            <button
              type="submit"
              className="rounded-lg border border-zinc-900 px-4 font-bold"
            >
              設定
            </button>
          </div>
          {savingsNote && (
            <p className="mt-2 text-xs text-zinc-500">{savingsNote}</p>
          )}
        </form>

        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}