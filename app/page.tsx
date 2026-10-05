"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMonthKey, yen } from "@/lib/money";

const CATEGORIES = ["食費", "交通費", "娯楽", "日用品", "その他"];

type Expense = {
  id: string;
  amount: number;
  memo: string;
  category: string;
  created_at: string;
};

type Settings = {
  initial_savings: number;
  savings_start_at: string;
};

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [incomes, setIncomes] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) setError("読み込みに失敗しました: " + error.message);
    else setExpenses(data ?? []);

    const { data: bs, error: bError } = await supabase
      .from("budgets")
      .select("month, amount");
    if (bError) {
      setError("予算の読み込みに失敗しました: " + bError.message);
    } else {
      const map: Record<string, number> = {};
      for (const b of bs ?? []) map[b.month] = b.amount;
      setBudgets(map);
    }

    const { data: inc, error: iError } = await supabase
      .from("monthly_incomes")
      .select("month, amount");
    if (iError) {
      setError("給料の読み込みに失敗しました: " + iError.message);
    } else {
      const map: Record<string, number> = {};
      for (const i of inc ?? []) map[i.month] = i.amount;
      setIncomes(map);
    }

    const { data: s, error: sError } = await supabase
      .from("settings")
      .select("initial_savings, savings_start_at")
      .maybeSingle();
    if (sError) setError("設定の読み込みに失敗しました: " + sError.message);
    else setSettings(s);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      setError("金額は1以上の整数で入力してください");
      return;
    }
    setError("");
    const { error } = await supabase
      .from("expenses")
      .insert({ amount: value, memo, category });
    if (error) {
      setError("保存に失敗しました: " + error.message);
      return;
    }
    setAmount("");
    setMemo("");
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この記録を削除しますか?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setError("削除に失敗しました: " + error.message);
      return;
    }
    setError("");
    await load();
  }

  const thisMonth = getMonthKey(new Date());
  const budget: number | null = thisMonth in budgets ? budgets[thisMonth] : null;

  const todayTotal = expenses
    .filter((x) => isToday(x.created_at))
    .reduce((sum, x) => sum + x.amount, 0);

  const monthTotal = expenses
    .filter((x) => getMonthKey(new Date(x.created_at)) === thisMonth)
    .reduce((sum, x) => sum + x.amount, 0);

  const monthRemain = (budget ?? 0) - monthTotal;
  const reserved = Math.max(monthRemain, 0);

  const startAt = settings ? new Date(settings.savings_start_at) : null;
  const startMonth = startAt ? getMonthKey(startAt) : "";

  const incomeTotal = settings
    ? Object.entries(incomes)
        .filter(([month]) => month >= startMonth)
        .reduce((sum, [, a]) => sum + a, 0)
    : 0;

  const spentSinceStart =
    settings && startAt
      ? expenses
          .filter((x) => new Date(x.created_at) >= startAt)
          .reduce((sum, x) => sum + x.amount, 0)
      : 0;

  const totalAssets = settings
    ? settings.initial_savings + incomeTotal - spentSinceStart
    : null;

  const outsideSavings =
    totalAssets !== null && budget !== null ? totalAssets - reserved : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-md p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">おかいも</h1>
          <Link href="/settings" className="text-sm text-zinc-600 underline">
            設定
          </Link>
        </div>

        <div className="mt-4 rounded-xl bg-white p-4 shadow">
          {budget !== null ? (
            <>
              <p className="text-sm text-zinc-500">今月の残り</p>
              <p
                className={
                  "text-4xl font-bold " + (monthRemain < 0 ? "text-red-600" : "")
                }
              >
                {monthRemain < 0 ? yen(-monthRemain) + " 超過" : yen(monthRemain)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                予算 {yen(budget)} / 今月使った額 {yen(monthTotal)}
              </p>
              <p className="text-sm text-zinc-500">
                今日使った額 {yen(todayTotal)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-500">今日使った額</p>
              <p className="text-3xl font-bold">{yen(todayTotal)}</p>
              <p className="mt-2 text-sm text-zinc-500">
                <Link href="/settings" className="underline">
                  設定ページ
                </Link>
                で今月の予算を入れると、今月の残りが表示されます
              </p>
            </>
          )}
        </div>

        {totalAssets !== null && settings ? (
          <div className="mt-3 rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-zinc-500">貯金(全財産)</p>
            <p className="text-2xl font-bold">{yen(totalAssets)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              最初の貯金 {yen(settings.initial_savings)} + 給料{" "}
              {yen(incomeTotal)} - 使った額 {yen(spentSinceStart)}
            </p>
            {outsideSavings !== null && (
              <p className="text-xs text-zinc-500">
                うち今月使える分 {yen(reserved)} / 予算外の貯金{" "}
                {yen(outsideSavings)}
              </p>
            )}
            {!(thisMonth in incomes) && (
              <p className="mt-1 text-xs text-zinc-500">
                今月の給料が未入力です(
                <Link href="/settings" className="underline">
                  設定ページ
                </Link>
                )
              </p>
            )}
          </div>
        ) : (
          <Link
            href="/settings"
            className="mt-3 block rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-600"
          >
            最初の貯金を設定する
          </Link>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border px-3 py-1 text-sm " +
                  (category === c
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700")
                }
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="金額(円)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white p-3 text-lg"
          />
          <input
            type="text"
            placeholder="メモ(任意)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white p-3"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 p-3 font-bold text-white"
          >
            記録する
          </button>
        </form>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <ul className="mt-6 divide-y divide-zinc-200 rounded-xl bg-white shadow">
          {loading && <li className="p-4 text-zinc-500">読み込み中...</li>}
          {!loading && expenses.length === 0 && (
            <li className="p-4 text-zinc-500">まだ記録がありません</li>
          )}
          {expenses.slice(0, 100).map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="mr-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {x.category}
                  </span>
                  {x.memo || "(メモなし)"}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(x.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold">{yen(x.amount)}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(x.id)}
                  className="text-sm text-red-600"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}