"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = ["食費", "交通費", "娯楽", "日用品", "その他"];

type Expense = {
  id: string;
  amount: number;
  memo: string;
  category: string;
  created_at: string;
};

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function yen(n: number) {
  return (n < 0 ? "-¥" : "¥") + Math.abs(n).toLocaleString();
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [budget, setBudget] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError("読み込みに失敗しました: " + error.message);
    else setExpenses(data ?? []);

    const { data: b, error: bError } = await supabase
      .from("budgets")
      .select("amount")
      .eq("month", getMonthKey(new Date()))
      .maybeSingle();
    if (bError) setError("予算の読み込みに失敗しました: " + bError.message);
    else setBudget(b ? b.amount : null);

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

  async function handleBudgetSave(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(budgetInput);
    if (!Number.isInteger(value) || value < 0) {
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
    setBudgetInput("");
    await load();
  }

  const thisMonth = getMonthKey(new Date());
  const hasBudget = budget !== null;
  const budgetValue = budget ?? 0;

  const todayTotal = expenses
    .filter((x) => isToday(x.created_at))
    .reduce((sum, x) => sum + x.amount, 0);

  const monthTotal = expenses
    .filter((x) => getMonthKey(new Date(x.created_at)) === thisMonth)
    .reduce((sum, x) => sum + x.amount, 0);

  const monthRemain = budgetValue - monthTotal;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-bold">おかいも</h1>

        <div className="mt-4 rounded-xl bg-white p-4 shadow">
          {hasBudget ? (
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
                予算 {yen(budgetValue)} / 今月使った額 {yen(monthTotal)}
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
                今月の予算を入力すると、今月の残りが表示されます
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleBudgetSave} className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder={
              hasBudget ? "今月の予算を変更(円)" : "今月の予算(円)"
            }
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white p-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-900 px-4 font-bold"
          >
            設定
          </button>
        </form>

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
          {expenses.map((x) => (
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