"use client";

import { useState } from "react";

// 📅 月历视图：当月每天热力格（学习时长着色），点击查看当天记录
type Log = { id: number; date: string; hours: number; content: string; plan_tomorrow: string };

export default function CalendarView({
  days,
  logs,
  onPick,
}: {
  days: { date: string; hours: number }[];
  logs: Log[];
  onPick: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const byDate = new Map(days.map((d) => [d.date, d.hours]));
  const logByDate = new Map<string, Log[]>();
  for (const l of logs) {
    const k = l.date.slice(0, 10);
    logByDate.set(k, [...(logByDate.get(k) ?? []), l]);
  }

  const first = new Date(month.y, month.m, 1);
  const lead = first.getDay() === 0 ? 6 : first.getDay() - 1; // 周一开头
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;

  function shift(delta: number) {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function color(h: number): string {
    if (h <= 0) return "bg-slate-50 text-slate-400";
    if (h < 1) return "bg-blue-100 text-blue-800";
    if (h < 3) return "bg-blue-300 text-blue-900";
    if (h < 6) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {month.y} 年 {month.m + 1} 月
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => shift(-1)}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            ← 上月
          </button>
          <button
            onClick={() => shift(1)}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            下月 →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
          <div key={w} className="py-1 text-xs font-semibold text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`x${i}`} />;
          const ds = `${month.y}-${p(month.m + 1)}-${p(d)}`;
          const h = byDate.get(ds) ?? 0;
          const hasLog = (logByDate.get(ds)?.length ?? 0) > 0;
          const isToday = ds === todayStr;
          return (
            <button
              key={ds}
              onClick={() => onPick(ds)}
              title={`${ds}：${h}h${hasLog ? "，有记录" : ""}`}
              className={`relative rounded-lg py-2 text-xs font-medium transition hover:scale-105 ${color(h)} ${
                isToday ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {d}
              {hasLog && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-400" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="h-2.5 w-2.5 rounded bg-slate-50 border border-slate-200" /> 0h
        <span className="h-2.5 w-2.5 rounded bg-blue-100" /> &lt;1h
        <span className="h-2.5 w-2.5 rounded bg-blue-300" /> 1-3h
        <span className="h-2.5 w-2.5 rounded bg-blue-500" /> 3-6h
        <span className="h-2.5 w-2.5 rounded bg-blue-700" /> 6h+
      </div>
    </div>
  );
}
