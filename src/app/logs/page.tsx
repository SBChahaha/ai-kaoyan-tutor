"use client";

import { useEffect, useState } from "react";

type Log = {
  id: number;
  date: string;
  hours: number;
  content: string;
  plan_tomorrow: string;
  created_at: string;
};

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function LogsPage() {
  const [list, setList] = useState<Log[]>([]);
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState("8");
  const [content, setContent] = useState("");
  const [plan, setPlan] = useState("");

  async function load() {
    const r = await fetch("/api/logs");
    setList(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!content.trim() && !plan.trim()) return;
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, hours, content, plan_tomorrow: plan }),
    });
    setContent("");
    setPlan("");
    setHours("8");
    load();
  }

  const total = list.reduce((s, l) => s + l.hours, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📝 学习日志</h1>
        <span className="text-sm text-slate-500">
          累计 <b className="text-blue-600">{total}</b> 小时
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            min={0}
            max={24}
            className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span className="self-center text-sm text-slate-500">小时</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天学了什么？(科目/内容/感受)"
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={3}
        />
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="明天计划（选填）"
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={2}
        />
        <button
          onClick={add}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          记录
        </button>
      </div>

      <div className="space-y-3">
        {list.map((l) => (
          <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold">{l.date}</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {l.hours} h
              </span>
            </div>
            {l.content && <p className="whitespace-pre-wrap text-sm">{l.content}</p>}
            {l.plan_tomorrow && (
              <p className="mt-2 text-xs text-slate-500">
                <b>明日计划：</b>
                {l.plan_tomorrow}
              </p>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">还没有日志，从今天开始记录吧</p>
        )}
      </div>
    </div>
  );
}
