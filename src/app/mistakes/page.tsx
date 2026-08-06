"use client";

import { useEffect, useState } from "react";
import ReviewClient from "./ReviewClient";
import BatchOps from "./BatchOps";

type Mistake = {
  id: number;
  subject: string;
  chapter: string;
  question: string;
  my_answer: string;
  right_answer: string;
  wrong_reason: string;
  ai_analysis: string;
  status: string;
  created_at: string;
  options?: string;
  review_count?: number;
  last_reviewed_at?: string | null;
};

const SUBJECTS = ["数据结构", "操作系统", "计算机组成原理", "计算机网络", "数学一", "英语一", "政治"];

const empty = {
  subject: "数据结构",
  chapter: "",
  question: "",
  my_answer: "",
  right_answer: "",
  wrong_reason: "",
};

export default function MistakesPage() {
  const [list, setList] = useState<Mistake[]>([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ ...empty });
  const [busy, setBusy] = useState(false);
  const [aiId, setAiId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"overdue" | "newest">("overdue");

  async function load() {
    const r = await fetch("/api/mistakes");
    setList(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!form.question.trim()) return;
    const r = await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? "录入失败");
      return;
    }
    setForm({ ...empty });
    load();
  }

  async function aiAnalyze(m: Mistake) {
    setAiId(m.id);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "请解析这道错题",
          mistake: {
            subject: m.subject,
            chapter: m.chapter,
            question: m.question,
            my_answer: m.my_answer,
            right_answer: m.right_answer,
            wrong_reason: m.wrong_reason,
          },
        }),
      });
      const data = await r.json();
      const analysis = data.answer ?? data.error ?? "解析失败";
      await fetch(`/api/mistakes/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_analysis: analysis }),
      });
      load();
    } finally {
      setAiId(null);
    }
  }

  async function toggleStatus(m: Mistake) {
    await fetch(`/api/mistakes/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: m.status === "pending" ? "reviewed" : "pending" }),
    });
    load();
  }

  async function remove(m: Mistake) {
    if (!confirm("删除这道错题？")) return;
    await fetch(`/api/mistakes/${m.id}`, { method: "DELETE" });
    load();
  }

  const shown = filter ? list.filter((m) => m.subject === filter) : list;
  // 排序：逾期优先（待复习按时间最久在前，其余按最新在前）
  const sorted = [...shown].sort((a, b) => {
    if (sortMode === "overdue") {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.status === "pending") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const kw = search.trim().toLowerCase();
  const shownFiltered = (kw
    ? sorted.filter(
        (m) =>
          m.question.toLowerCase().includes(kw) ||
          (m.right_answer ?? "").toLowerCase().includes(kw) ||
          (m.my_answer ?? "").toLowerCase().includes(kw) ||
          (m.wrong_reason ?? "").toLowerCase().includes(kw) ||
          (m.chapter ?? "").toLowerCase().includes(kw)
      )
    : sorted
  );
  const pendingCount = list.filter((m) => m.status === "pending").length;

  // 逾期天数（待复习超过 3 天）
  function overdueDays(createdAt: string): number {
    const d = (Date.now() - new Date(createdAt).getTime()) / 86400000;
    return Math.max(0, Math.floor(d - 3));
  }

  // 艾宾浩斯下次复习日期（与后端 reviewInterval 一致：1/3/7/15/30 天）
  function nextDue(m: { review_count?: number; last_reviewed_at?: string | null; created_at: string }): Date {
    const intervals = [1, 3, 7, 15, 30];
    const n = Math.min(m.review_count ?? 0, intervals.length - 1);
    const base = m.last_reviewed_at ? new Date(m.last_reviewed_at) : new Date(m.created_at);
    return new Date(base.getTime() + intervals[n] * 86400000);
  }
  const overdueCount = list.filter(
    (m) => m.status === "pending" && overdueDays(m.created_at) > 0
  ).length;

  // 错题科目分布
  const subjectCounts = new Map<string, number>();
  for (const m of list) subjectCounts.set(m.subject, (subjectCounts.get(m.subject) ?? 0) + 1);
  const maxSubject = Math.max(1, ...subjectCounts.values());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">✍️ 错题本</h1>
        <div className="text-sm text-slate-500">
          待复习 <span className="font-bold text-orange-600">{pendingCount}</span> 道
          {overdueCount > 0 && (
            <span className="ml-1 font-bold text-red-600">· 逾期 {overdueCount} 道 ⏰</span>
          )}
        </div>
      </div>

      {/* 自动整理说明 */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        🤖 <b>错题自动整理已开启</b>：闯关测试答错或疑似蒙对的题会自动进入这里（含题目、你的错误答案、正确答案、解析），无需手动录入。
        <span className="ml-2 text-green-600">
          也可以在聊天里说"整理错题"并贴出题目，AI 会帮你录入。
        </span>
      </div>

      {/* 科目分布 */}
      {subjectCounts.size > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-xs text-slate-400">错题科目分布（定位薄弱科目）</div>
          <div className="space-y-1.5">
            {Array.from(subjectCounts.entries()).map(([s, n]) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 truncate text-slate-600">{s}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      n / maxSubject > 0.7 ? "bg-red-500" : n / maxSubject > 0.4 ? "bg-orange-400" : "bg-blue-400"
                    }`}
                    style={{ width: `${(n / maxSubject) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-slate-400">{n} 道</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 复习模式 */}
      {pendingCount > 0 && (
        <ReviewClient
          onDone={() => {
            load();
            setFilter("");
            setSelected(new Set());
          }}
        />
      )}

      {/* 批量操作 */}
      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={selected.size === list.length && list.length > 0}
              onChange={(e) =>
                setSelected(e.target.checked ? new Set(list.map((m) => m.id)) : new Set())
              }
              className="accent-blue-600"
            />
            全选
          </label>
          <BatchOps
            ids={Array.from(selected)}
            onDone={() => {
              setSelected(new Set());
              load();
            }}
          />
          <span className="text-xs text-slate-400">
            已选 {selected.size} 道{selected.size > 0 ? "（也可逐题勾选）" : "（勾选后批量操作）"}
          </span>
        </div>
      )}

      {/* 导出 */}
      {list.length > 0 && (
        <div className="flex justify-end gap-2">
          <a
            href="/api/mistakes/export"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ⬇️ 导出 Markdown
          </a>
          <a
            href="/api/export?type=mistakes"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ⬇️ 导出 CSV
          </a>
        </div>
      )}

      {/* 添加错题表单 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            value={form.chapter}
            onChange={(e) => setForm({ ...form, chapter: e.target.value })}
            placeholder="章节（如：排序）"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            value={form.wrong_reason}
            onChange={(e) => setForm({ ...form, wrong_reason: e.target.value })}
            placeholder="错误原因（如：概念混淆）"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm md:col-span-2"
          />
        </div>
        <textarea
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          placeholder="题目内容（粘贴或手打）"
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={3}
        />
        <div className="grid gap-2 md:grid-cols-2">
          <textarea
            value={form.my_answer}
            onChange={(e) => setForm({ ...form, my_answer: e.target.value })}
            placeholder="我的答案（选填）"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
          />
          <textarea
            value={form.right_answer}
            onChange={(e) => setForm({ ...form, right_answer: e.target.value })}
            placeholder="正确答案（选填）"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            rows={2}
          />
        </div>
        <button
          onClick={add}
          className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          ➕ 加入错题本
        </button>
      </div>

      {/* 筛选 + 搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-3 py-1 text-xs ${!filter ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}
        >
          全部
        </button>
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? "" : s)}
            className={`rounded-full px-3 py-1 text-xs ${filter === s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            {s}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜题目/答案/原因…"
          className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          onClick={() => setSortMode((s) => (s === "overdue" ? "newest" : "overdue"))}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            sortMode === "overdue" ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-600"
          }`}
          title="切换排序方式"
        >
          {sortMode === "overdue" ? "⏰ 逾期优先" : "🕒 最新在前"}
        </button>
      </div>

      {/* 错题列表 */}
      <div className="space-y-3">
        {shownFiltered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            {kw ? "没有匹配的错题，换个关键词试试" : "还没有错题，做题后记得录入 📝"}
          </p>
        )}
        {shownFiltered.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(m.id);
                  else next.delete(m.id);
                  setSelected(next);
                }}
                className="accent-blue-600"
                title="选择后可用批量操作"
              />
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">{m.subject}</span>
              {m.chapter && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">{m.chapter}</span>
              )}
              <span
                className={`rounded px-2 py-0.5 ${
                  m.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                }`}
              >
                {m.status === "pending" ? "待复习" : "已复习"}
              </span>
              {m.status === "pending" && overdueDays(m.created_at) > 0 && (
                <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-600">
                  ⏰ 逾期 {overdueDays(m.created_at)} 天
                </span>
              )}
              {m.status === "reviewed" && (
                <span
                  className={`rounded px-2 py-0.5 ${
                    nextDue(m).getTime() <= Date.now() ? "bg-red-100 font-semibold text-red-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {nextDue(m).getTime() <= Date.now()
                    ? "🔔 到期该复习了"
                    : `下次复习 ${nextDue(m).toISOString().slice(0, 10)}（第 ${Math.min((m.review_count ?? 0) + 1, 5)} 轮）`}
                </span>
              )}
              <span className="text-slate-400">{m.created_at.slice(0, 10)}</span>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => aiAnalyze(m)}
                  disabled={aiId === m.id}
                  className="rounded bg-violet-600 px-2 py-1 text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {aiId === m.id ? "解析中…" : "✨ AI 解析"}
                </button>
                <button
                  onClick={() => toggleStatus(m)}
                  className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
                >
                  {m.status === "pending" ? "标记已复习" : "标回待复习"}
                </button>
                <button
                  onClick={() => remove(m)}
                  className="rounded border border-red-200 px-2 py-1 text-red-500 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.question}</p>
            {(m.my_answer || m.right_answer) && (
              <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                {m.my_answer && (
                  <div className="rounded bg-red-50 p-2 text-red-700">
                    <b>我的答案：</b>
                    {m.my_answer}
                  </div>
                )}
                {m.right_answer && (
                  <div className="rounded bg-green-50 p-2 text-green-700">
                    <b>正确答案：</b>
                    {m.right_answer}
                  </div>
                )}
              </div>
            )}
            {m.wrong_reason && (
              <p className="mt-2 text-xs text-slate-500">
                <b>错误原因：</b>
                {m.wrong_reason}
              </p>
            )}
            {m.ai_analysis && (
              <div className="mt-2 rounded bg-violet-50 p-3 text-xs text-violet-800">
                <b>🤖 AI 解析：</b>
                <div className="mt-1 whitespace-pre-wrap">{m.ai_analysis}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
