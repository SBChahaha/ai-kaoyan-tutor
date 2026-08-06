"use client";

import { useEffect, useState } from "react";

type Stats = {
  streak: number;
  total_hours: number;
  today_hours: number;
  last_30_days: { date: string; hours: number }[];
};

export default function TodayStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d));
  }, []);

  if (!stats) return <div className="p-4 text-center text-sm text-slate-400">加载统计…</div>;

  const week = stats.last_30_days.slice(-7);
  const maxH = Math.max(1, ...week.map((d) => d.hours));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">🔥 学习统计</h2>
        <span className="text-sm text-slate-500">
          累计 <b className="text-blue-600">{stats.total_hours}</b> h
        </span>
      </div>

      {/* 连续天数 + 今日时长（纯记录，无目标） */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.streak}
            <span className="text-sm font-normal text-orange-400"> 天</span>
          </div>
          <div className="text-xs text-orange-500">连续学习</div>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.today_hours}
            <span className="text-sm font-normal text-blue-400"> h</span>
          </div>
          <div className="text-xs text-blue-500">今天已学（记录）</div>
        </div>
      </div>

      {/* 近 7 天时长条形图 */}
      <div>
        <div className="mb-1.5 text-xs text-slate-400">近 7 天学习时长（h）</div>
        <div className="flex items-end justify-between gap-1.5">
          {week.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400">{d.hours > 0 ? d.hours : ""}</span>
              <div
                className={`w-full rounded-t ${d.hours > 0 ? "bg-blue-500" : "bg-slate-100"}`}
                style={{ height: `${Math.max(4, (d.hours / maxH) * 56)}px` }}
              />
              <span className="text-[10px] text-slate-400">{d.date.slice(5).replace("-", "/")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
