"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 🤔 首页快速提问：直接进入 AI 答疑（含常见问题快捷入口）
const SUGGESTIONS = [
  "等价无穷小有哪些？",
  "怎么证明函数单调有界？",
  "泰勒公式怎么展开？",
  "积分换元法怎么用？",
];

export default function QuickAsk() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function go(text?: string) {
    const t = (text ?? q).trim();
    if (!t) return;
    router.push(`/chat?q=${encodeURIComponent(t)}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-2 text-sm font-semibold text-slate-700">🤔 有问题，现在就想问？</div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="输入你的问题，AI 助教结合你的学习进度回答…"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          提问
        </button>
      </div>
      {!q && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => go(s)}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
