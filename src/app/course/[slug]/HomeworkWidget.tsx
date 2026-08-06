"use client";

import { useState } from "react";
import MathText from "../../components/MathText";
import SymbolPalette from "../../components/SymbolPalette";

export type HomeworkItem = {
  id: number;
  lesson_slug: string;
  question_index: number;
  answer: string;
  feedback: string;
  score: number | null;
  created_at: string;
};

// 从讲义 markdown 中解析"自查题"部分
export function parseHomeworkQuestions(content: string): string[] {
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("## ") && l.includes("自查题"));
  if (idx === -1) return [];
  const out: string[] = [];
  let current = "";
  for (const line of lines.slice(idx + 1)) {
    if (line.startsWith("## ")) break;
    if (line.startsWith("**答案") || line.startsWith("> ")) break;
    const m = line.match(/^\s*(\d+)\.\s*(.*)/);
    if (m) {
      if (current) out.push(current.trim());
      current = m[2];
    } else if (current) {
      current += " " + line.trim();
    }
  }
  if (current) out.push(current.trim());
  return out.filter(Boolean);
}

export default function HomeworkWidget({
  lessonSlug,
  content,
  initialItems,
}: {
  lessonSlug: string;
  content: string;
  initialItems: HomeworkItem[];
}) {
  const questions = parseHomeworkQuestions(content);
  const [items, setItems] = useState<HomeworkItem[]>(initialItems);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});

  if (questions.length === 0) return null;

  async function submit(qi: number) {
    const answer = (drafts[qi] ?? "").trim();
    if (!answer) return;
    setBusy((b) => ({ ...b, [qi]: true }));
    try {
      const r = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_slug: lessonSlug, question_index: qi, answer }),
      });
      const data = await r.json();
      if (data.id) {
        setItems((list) => [...list.filter((x) => x.question_index !== qi), data]);
        setDrafts((d) => ({ ...d, [qi]: "" }));
      }
    } finally {
      setBusy((b) => ({ ...b, [qi]: false }));
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="font-bold text-blue-900">📝 作业提交（AI 批改）</h2>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
          {items.length}/{questions.length} 已交
        </span>
      </div>
      <p className="mb-4 text-xs text-blue-700/70">
        作答后提交，AI 老师评分（满分 10 分）并写评语；批改记录保存在服务器，随时可查
      </p>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const qi = i + 1;
          const item = items.find((x) => x.question_index === qi);
          return (
            <div key={qi} className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    {qi}
                  </span>
                  <span className="inline-block align-middle">
                    <MathText text={q} />
                  </span>
                </div>
                {item?.score != null && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      item.score >= 8
                        ? "bg-green-100 text-green-700"
                        : item.score >= 6
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.score}/10
                  </span>
                )}
              </div>

              {item ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-400">我的作答：</span>
                    {item.answer}
                  </div>
                  {item.feedback && (
                    <div className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                      <MathText text={item.feedback} />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setItems((list) => list.filter((x) => x.question_index !== qi));
                      setDrafts((d) => ({ ...d, [qi]: item.answer }));
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ↻ 重做这题
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      直接写就行，AI 看得懂：ln(x^2-3x+2)、sqrt(2)、x&gt;=1
                    </p>
                    <SymbolPalette
                      onInsert={(s) =>
                        setDrafts((d) => ({ ...d, [qi]: (drafts[qi] ?? "") + s }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={drafts[qi] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [qi]: e.target.value }))}
                      placeholder="写下你的作答（先自己认真做，再提交批改）"
                      rows={2}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => submit(qi)}
                      disabled={busy[qi] || !(drafts[qi] ?? "").trim()}
                      className="shrink-0 self-stretch rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {busy[qi] ? "批改中…" : "提交"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
