import { NextResponse } from "next/server";
import { db, getSetting } from "@/lib/db";

// 学习统计：连续天数、时长分布、每日目标
export async function GET() {
  const rows = db.prepare("SELECT date, hours FROM logs").all() as unknown as {
    date: string;
    hours: number;
  }[];
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.hours);

  // 最近 30 天（含今天）
  const days: { date: string; hours: number }[] = [];
  const today = new Date();
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push({ date: fmt(d), hours: Math.round((byDate.get(fmt(d)) ?? 0) * 10) / 10 });
  }

  // 连续学习天数：从今天（或昨天）往前数
  const todayStr = fmt(today);
  let streak = 0;
  let cursor = new Date(today.getTime());
  if ((byDate.get(fmt(cursor)) ?? 0) <= 0) cursor = new Date(today.getTime() - 86400000); // 今天还没学，从昨天算
  while ((byDate.get(fmt(cursor)) ?? 0) > 0) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  const totalHours = Math.round(rows.reduce((s, r) => s + r.hours, 0) * 10) / 10;
  const todayHours = byDate.get(todayStr) ?? 0;
  const dailyTarget = Number(getSetting("daily_target", "8"));

  return NextResponse.json({
    streak,
    total_hours: totalHours,
    days_logged: byDate.size,
    today_hours: todayHours,
    daily_target: dailyTarget,
    target_met: todayHours >= dailyTarget,
    last_30_days: days,
  });
}
