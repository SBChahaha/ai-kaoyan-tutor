"use client";

import { useState } from "react";
import Link from "next/link";

type Q = { type: "choice" | "fill"; question: string; options?: string[] };
type Result = {
  index: number;
  type: string;
  question: string;
  given: string | number | null;
  correct: boolean;
  correct_answer: string;
  explanation: string;
};

export default function QuizClient({
  lessonSlug,
  lessonTitle,
  questions,
  passPercent,
  initialAttempts,
}: {
  lessonSlug: string;
  lessonTitle: string;
  questions: Q[];
  passPercent: number;
  initialAttempts: { id: number; score: number; total: number; percent: number; stars: number; passed: boolean; created_at: string }[];
}) {
  const [answers, setAnswers] = useState<(string | number | null)[]>(
    questions.map(() => null)
  );
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<{
    score: number;
    total: number;
    percent: number;
    stars: number;
    passed: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(initialAttempts);

  const q = questions[current];
  const answered = answers.every((a) => a !== null && a !== "");

  function choose(optIdx: number) {
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
  }

  function fillAnswer(v: string) {
    const next = [...answers];
    next[current] = v;
    setAnswers(next);
  }

  async function submit() {
    if (!answered || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/quiz/${encodeURIComponent(lessonSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await r.json();
      setResult(data.results);
      setSummary({
        score: data.score,
        total: data.total,
        percent: data.percent,
        stars: data.stars,
        passed: data.passed,
      });
      setAttempts((a) => [
        {
          id: data.attempt_id,
          score: data.score,
          total: data.total,
          percent: data.percent,
          stars: data.stars,
          passed: data.passed,
          created_at: new Date().toISOString(),
        },
        ...a,
      ]);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setResult(null);
    setSummary(null);
  }

  const stars = summary?.stars ?? 0;

  // ===== 结果页 =====
  if (summary && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-5xl">
            {summary.passed ? "🎉" : "💪"}
          </div>
          <h1 className="mt-3 text-2xl font-bold">
            {summary.passed ? "过关！" : "差一点，再试一次"}
          </h1>
          <div className="mt-2 text-3xl tracking-wider text-amber-400">
            {"★".repeat(stars)}
            <span className="text-slate-200">{"★".repeat(3 - stars)}</span>
          </div>
          <p className="mt-2 text-slate-600">
            {summary.score}/{summary.total} 题正确 · {summary.percent}% · 通过线 {passPercent}%
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {summary.passed ? "再刷一次（冲 3 星）" : "重新挑战"}
            </button>
            <Link
              href={`/course/${encodeURIComponent(lessonSlug)}`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              返回讲义
            </Link>
          </div>
        </div>

        {/* 逐题解析 */}
        <div className="space-y-3">
          {result.map((r) => (
            <div
              key={r.index}
              className={`rounded-xl border bg-white p-4 ${
                r.correct ? "border-green-200" : "border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                    r.correct ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {r.correct ? "✓" : "✗"}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-800">
                    {r.index + 1}. {r.question}
                  </p>
                  <p className="mt-1 text-slate-500">
                    你的答案：
                    {r.given === null || r.given === ""
                      ? "（未作答）"
                      : r.type === "choice"
                        ? questions[r.index].options?.[Number(r.given)] ?? r.given
                        : r.given}
                  </p>
                  <p className="mt-1 text-green-700">
                    正确答案：{r.correct_answer}
                  </p>
                  <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-slate-600">
                    {r.explanation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== 答题页 =====
  return (
    <div className="mx-auto max-w-2xl">
      {/* 进度条 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">
            第 {current + 1}/{questions.length} 题
          </span>
          <span className="text-slate-400">通过线 {passPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {q.type === "choice" ? "选择题" : "填空题"}
        </span>
        <h2 className="mt-3 text-lg font-semibold leading-relaxed text-slate-800">
          {q.question}
        </h2>

        {q.type === "choice" ? (
          <div className="mt-5 space-y-2.5">
            {q.options!.map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            value={(answers[current] as string) ?? ""}
            onChange={(e) => fillAnswer(e.target.value)}
            placeholder="输入你的答案…"
            className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
          />
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ← 上一题
          </button>
          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={answers[current] === null || answers[current] === ""}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              下一题 →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!answered || busy}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
            >
              {busy ? "判分中…" : "提交判分"}
            </button>
          )}
        </div>
      </div>

      {/* 历史尝试 */}
      {attempts.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">📜 闯关记录</h3>
          <ul className="space-y-1.5 text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-slate-600">
                <span>
                  {a.passed ? "✅ 通过" : "❌ 未过"} · {a.score}/{a.total} ·{" "}
                  {a.created_at.slice(0, 16).replace("T", " ")}
                </span>
                <span className="text-amber-400">{"★".repeat(a.stars)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
