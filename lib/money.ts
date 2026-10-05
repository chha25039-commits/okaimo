export function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function prevMonthKey(d: Date) {
  return getMonthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

export function yen(n: number) {
  return (n < 0 ? "-¥" : "¥") + Math.abs(n).toLocaleString();
}