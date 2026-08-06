"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 🤔 首页快速提问：直接进入 AI 答疑
export default function QuickAsk() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form
      onSubmit={go}
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
    </form>
  );
}
