"use client";

import { useEffect, useState } from "react";
import MathText from "../components/MathText";

type DQ = { idx: number; question: string; options: string[]; lesson: string };

export default function DailyReviewCard() {
  const [data, setData] = useState<{
    seed: number;
    done: boolean;
    today_result: { score: number; total: number } | null;
    total: number;
  } | null>(null);
  const [questions, setQuestions] = useState<DQ[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    results: { lesson: string; question: string; given: number | null; correct: boolean; correct_answer: string; explanation: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/daily-review")
      .then((r) => r.json())
      .then((d) => {
        setData({ seed: d.seed, done: d.done, today_result: d.today_result, total: d.total });
      });
  }, []);

  async function start() {
    const r = await fetch("/api/daily-review");
    const d = await r.json();
    setData({ seed: d.seed, done: d.done, today_result: d.today_result, total: d.total });
    setQuestions(d.questions);
    setAnswers(d.questions.map(() => -1));
    setResult(null);
  }

  async function submit() {
    if (busy || !data) return;
    setBusy(true);
    try {
      const r = await fetch("/api/daily-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: data.seed, answers }),
      });
      const d = await r.json();
      setResult(d);
      setData((s) => (s ? { ...s, done: true, today_result: { score: d.score, total: d.total } } : s));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="p-4 text-center text-sm text-slate-400">加载今日回顾…</div>;

  // 已完成状态
  if (data.done && !result && !questions) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <div className="text-2xl">✅</div>
        <div className="mt-1 font-semibold text-green-800">今日回顾已完成</div>
        {data.today_result && (
          <p className="text-sm text-green-600">
            {data.today_result.score}/{data.today_result.total} 题正确
          </p>
        )}
        <button
          onClick={start}
          className="mt-3 rounded-lg border border-green-300 px-4 py-1.5 text-xs text-green-700 hover:bg-green-100"
        >
          再练一轮
        </button>
      </div>
    );
  }

  // 结果页
  if (result) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 text-center">
          <div className="text-2xl">{result.score === result.total ? "🎉" : "👍"}</div>
          <p className="font-semibold">
            今日回顾：{result.score}/{result.total} 题正确
          </p>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {result.results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border p-2.5 text-sm ${r.correct ? "border-green-100 bg-green-50/40" : "border-red-100 bg-red-50/40"}`}
            >
              <p className="text-slate-700">
                <span className={r.correct ? "text-green-600" : "text-red-600"}>
                  {r.correct ? "✓" : "✗"}
                </span>{" "}
                <span className="inline-block align-middle">
                  <MathText text={r.question} />
                </span>
              </p>
              {!r.correct && (
                <p className="mt-1 text-xs text-slate-500">
                  正确答案：{r.correct_answer}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <button
            onClick={start}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            换一组再练
          </button>
        </div>
      </div>
    );
  }

  // 答题页
  if (questions && questions.length > 0) {
    const allAnswered = answers.every((a) => a >= 0);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">📅 今日回顾（{questions.length} 题）</h3>
          <button onClick={() => setQuestions(null)} className="text-xs text-slate-400 hover:text-slate-600">
            取消
          </button>
        </div>
        <div className="space-y-3">
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border border-slate-100 p-3">
              <p className="mb-2 text-sm font-medium text-slate-800">
                {qi + 1}. <span className="inline-block align-middle"><MathText text={q.question} /></span>
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => {
                      const next = [...answers];
                      next[qi] = oi;
                      setAnswers(next);
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      answers[qi] === oi
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-slate-200 text-slate-700 hover:border-blue-300"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        answers[qi] === oi ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="inline-block align-middle"><MathText text={opt} /></span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <button
            onClick={submit}
            disabled={!allAnswered || busy}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
          >
            {busy ? "提交中…" : "提交"}
          </button>
        </div>
      </div>
    );
  }

  // 入口
  return (
    <button
      onClick={start}
      className="w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 px-4 py-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
    >
      📅 今日回顾：从已学内容随机抽 {data.total || 5} 题，检验是否还记得
    </button>
  );
}
