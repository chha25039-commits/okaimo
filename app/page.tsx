"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/components/AuthGate";
import { LeafIcon } from "@/components/Leaf";
import { getMonthKey, yen } from "@/lib/money";

const CATEGORIES = ["食費", "交通費", "娯楽", "日用品", "その他"];

const CARD =
  "rounded-3xl border border-line bg-paper p-5 shadow-[0_4px_24px_rgba(79,111,82,0.07)]";
const LABEL = "text-xs tracking-widest text-ink-soft";
const INPUT =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-ink placeholder:text-ink-soft/60";

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

function HomeContent() {
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
  const usedRatio =
    budget === null
      ? 0
      : budget > 0
        ? Math.min(monthTotal / budget, 1)
        : monthTotal > 0
          ? 1
          : 0;

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
    <main>
      <div className="mx-auto max-w-md px-4 pb-16 pt-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LeafIcon className="h-7 w-7 text-leaf" />
            <h1 className="font-serif text-2xl tracking-widest">おかいも</h1>
          </div>
          <Link
            href="/settings"
            className="rounded-full border border-line bg-paper px-4 py-1.5 text-sm text-ink-soft transition hover:border-leaf"
          >
            設定
          </Link>
        </header>

        <section className={CARD + " mt-6"}>
          {budget !== null ? (
            <>
              <p className={LABEL}>今月の残り</p>
              <p
                className={
                  "mt-1 font-serif text-5xl tabular-nums " +
                  (monthRemain < 0 ? "text-clay" : "")
                }
              >
                {monthRemain < 0 ? yen(-monthRemain) : yen(monthRemain)}
                {monthRemain < 0 && (
                  <span className="ml-2 text-base">超過</span>
                )}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-leaf-pale">
                <div
                  className={
                    "h-full rounded-full transition-all " +
                    (monthRemain < 0 ? "bg-clay" : "bg-leaf")
                  }
                  style={{ width: `${usedRatio * 100}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-ink-soft">
                <span>予算 {yen(budget)}</span>
                <span>今月使った額 {yen(monthTotal)}</span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                今日使った額 {yen(todayTotal)}
              </p>
            </>
          ) : (
            <>
              <p className={LABEL}>今日使った額</p>
              <p className="mt-1 font-serif text-4xl tabular-nums">
                {yen(todayTotal)}
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                <Link href="/settings" className="underline">
                  設定ページ
                </Link>
                で今月の予算を入れると、今月の残りが表示されます
              </p>
            </>
          )}
        </section>

        {totalAssets !== null && settings ? (
          <section className={CARD + " mt-4"}>
            <p className={LABEL}>貯金(全財産)</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {yen(totalAssets)}
            </p>
            {outsideSavings !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-leaf-pale/70 p-3">
                  <p className="text-xs text-ink-soft">今月使える分</p>
                  <p className="mt-1 font-serif text-lg tabular-nums">
                    {yen(reserved)}
                  </p>
                </div>
                <div className="rounded-2xl bg-leaf-pale/70 p-3">
                  <p className="text-xs text-ink-soft">予算外の貯金</p>
                  <p className="mt-1 font-serif text-lg tabular-nums">
                    {yen(outsideSavings)}
                  </p>
                </div>
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              最初の貯金 {yen(settings.initial_savings)} + 給料{" "}
              {yen(incomeTotal)} - 使った額 {yen(spentSinceStart)}
            </p>
            {!(thisMonth in incomes) && (
              <p className="mt-1 text-xs text-ink-soft">
                今月の給料が未入力です(
                <Link href="/settings" className="underline">
                  設定ページ
                </Link>
                )
              </p>
            )}
          </section>
        ) : (
          <Link
            href="/settings"
            className="mt-4 block rounded-3xl border border-dashed border-line p-5 text-center text-sm text-ink-soft"
          >
            最初の貯金を設定する
          </Link>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <p className={LABEL}>記録する</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border px-4 py-1.5 text-sm transition " +
                  (category === c
                    ? "border-leaf bg-leaf text-white"
                    : "border-line bg-paper text-ink-soft hover:border-leaf")
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
            className={INPUT + " text-lg"}
          />
          <input
            type="text"
            placeholder="メモ(任意)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={INPUT}
          />
          <button
            type="submit"
            className="rounded-2xl bg-leaf py-3 font-medium text-white shadow-sm transition hover:bg-leaf-dark active:scale-[0.99]"
          >
            記録する
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-clay">{error}</p>}

        <p className={LABEL + " mt-8"}>記録</p>
        <ul className={CARD + " mt-3 divide-y divide-line !p-0"}>
          {loading && <li className="p-5 text-ink-soft">読み込み中...</li>}
          {!loading && expenses.length === 0 && (
            <li className="p-5 text-sm text-ink-soft">まだ記録がありません</li>
          )}
          {expenses.slice(0, 100).map((x) => (
            <li
              key={x.id}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate">
                  <span className="mr-2 rounded-full bg-leaf-pale px-2.5 py-0.5 text-xs text-leaf-dark">
                    {x.category}
                  </span>
                  {x.memo || "(メモなし)"}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Date(x.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="font-serif text-lg tabular-nums">{yen(x.amount)}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(x.id)}
                  className="text-xs text-ink-soft transition hover:text-clay"
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

export default function Home() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}