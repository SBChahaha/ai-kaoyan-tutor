"use client";

import { useEffect, useState } from "react";

type Plan = { id: number; date: string; subject: string; task: string; done: number };

export default function TodayPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subject, setSubject] = useState("数学一");
  const [task, setTask] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const t = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    setToday(t);
    fetch(`/api/plans?date=${t}`)
      .then((r) => r.json())
      .then(setPlans);
  }, []);

  // 本地日期（不能用 toISOString——UTC 会跨天）
  function localToday(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  async function addPlan() {
    if (!task.trim()) return;
    const r = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, subject, task }),
    });
    const { id } = await r.json();
    setPlans([...plans, { id, date: today, subject, task, done: 0 }]);
    setTask("");
  }

  async function toggle(p: Plan) {
    await fetch(`/api/plans/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !p.done }),
    });
    setPlans(plans.map((x) => (x.id === p.id ? { ...x, done: x.done ? 0 : 1 } : x)));
  }

  async function completeAll() {
    await Promise.all(
      plans
        .filter((p) => !p.done)
        .map((p) =>
          fetch(`/api/plans/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: true }),
          })
        )
    );
    setPlans(plans.map((p) => ({ ...p, done: 1 })));
  }

  async function loadDate(date: string) {
    setToday(date);
    const r = await fetch(`/api/plans?date=${date}`);
    setPlans(await r.json());
  }

  const doneCount = plans.filter((p) => p.done).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">📋 学习清单</h2>
        <span className="text-sm text-slate-500">
          {doneCount}/{plans.length} 完成
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <input
          type="date"
          value={today}
          onChange={(e) => e.target.value && loadDate(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-xs"
          title="查看任意日期的清单"
        />
        {plans.length > 0 && doneCount < plans.length && (
          <button
            onClick={completeAll}
            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
          >
            ✅ 一键全完成
          </button>
        )}
        {today !== localToday() && (
          <button
            onClick={() => loadDate(localToday())}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            回到今天
          </button>
        )}
      </div>
      <ul className="mb-3 space-y-1.5">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!p.done}
              onChange={() => toggle(p)}
              className="h-4 w-4 accent-blue-600"
            />
            <span className={p.done ? "text-slate-400 line-through" : ""}>{p.task}</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
              {p.subject}
            </span>
          </li>
        ))}
        {plans.length === 0 && <li className="text-sm text-slate-400">今天还没有计划</li>}
      </ul>
      <div className="flex gap-2">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option>数学一</option>
          <option>408</option>
          <option>英语一</option>
          <option>政治</option>
          <option>通用</option>
        </select>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlan()}
          placeholder="添加计划，如：高数 极限与连续 2h"
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={addPlan}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          添加
        </button>
      </div>
    </div>
  );
}
