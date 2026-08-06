"use client";

import { useEffect, useState } from "react";

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

  async function load() {
    const r = await fetch("/api/mistakes");
    setList(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!form.question.trim()) return;
    await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
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
  const pendingCount = list.filter((m) => m.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">✍️ 错题本</h1>
        <div className="text-sm text-slate-500">
          待复习 <span className="font-bold text-orange-600">{pendingCount}</span> 道
        </div>
      </div>

      {/* 自动整理说明 */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        🤖 <b>错题自动整理已开启</b>：闯关测试答错或疑似蒙对的题会自动进入这里（含题目、你的错误答案、正确答案、解析），无需手动录入。
        <span className="ml-2 text-green-600">
          也可以在聊天里说"整理错题"并贴出题目，AI 会帮你录入。
        </span>
      </div>

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

      {/* 筛选 */}
      <div className="flex gap-2">
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
      </div>

      {/* 错题列表 */}
      <div className="space-y-3">
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">还没有错题，做题后记得录入 📝</p>
        )}
        {shown.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
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
