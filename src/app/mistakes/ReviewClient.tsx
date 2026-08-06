"use client";

import { useState } from "react";
import MathText from "../components/MathText";

type RQ = { mistake_id: number; question: string; options: string[] };

export default function ReviewClient({ onDone }: { onDone: () => void }) {
  const [questions, setQuestions] = useState<RQ[] | null>(null);
  const [seed, setSeed] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percent: number;
    remaining: number;
    results: { mistake_id: number; question: string; given: number | null; correct: boolean; correct_answer: string; explanation: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    const r = await fetch("/api/review");
    const d = await r.json();
    setQuestions(d.questions);
    setSeed(d.seed ?? 0);
    setAnswers(d.questions.map(() => -1));
    setResult(null);
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, seed }),
      });
      const d = await r.json();
      setResult(d);
      onDone(); // 刷新错题列表
    } finally {
      setBusy(false);
    }
  }

  function exit() {
    setQuestions(null);
    setResult(null);
  }

  // 结果页
  if (result && questions) {
    const allDone = result.remaining === 0;
    return (
      <div className="rounded-2xl border border-green-200 bg-white p-5">
        <div className="mb-3 text-center">
          <div className="text-2xl">{allDone ? "🎉" : "👍"}</div>
          <h3 className="mt-1 font-bold">
            复习完成：答对 {result.score}/{result.total}
          </h3>
          <p className="text-sm text-slate-500">
            {allDone
              ? "错题本已清空，全部标记已复习！"
              : `答对的已标记已复习，还剩 ${result.remaining} 道待复习`}
          </p>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {result.results.map((r, i) => (
            <div
              key={r.mistake_id}
              className={`rounded-lg border p-3 text-sm ${r.correct ? "border-green-100 bg-green-50/50" : "border-red-100 bg-red-50/50"}`}
            >
              <p className="font-medium text-slate-800">
                <span className={r.correct ? "text-green-600" : "text-red-600"}>
                  {r.correct ? "✓" : "✗"}
                </span>{" "}
                <span className="inline-block align-middle">
                  <MathText text={r.question} />
                </span>
              </p>
              <p className="mt-1 text-slate-500">
                正确答案：{r.correct_answer}
              </p>
              {!r.correct && (
                <p className="mt-1 text-xs text-slate-500">解析：{r.explanation}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={start}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {allDone ? "再来一轮（已清空）" : "再测一轮"}
          </button>
          <button
            onClick={exit}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            返回错题本
          </button>
        </div>
      </div>
    );
  }

  // 答题页
  if (questions && questions.length > 0) {
    const allAnswered = answers.every((a) => a >= 0);
    return (
      <div className="rounded-2xl border border-blue-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">🎯 复习测试（{questions.length} 题）</h3>
          <button onClick={exit} className="text-xs text-slate-400 hover:text-slate-600">
            退出复习
          </button>
        </div>
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={q.mistake_id} className="rounded-xl border border-slate-100 p-3">
              <p className="mb-2 text-sm font-medium text-slate-800">
                {qi + 1}. <span className="inline-block align-middle"><MathText text={q.question} /></span>
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const sel = answers[qi] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => {
                        const next = [...answers];
                        next[qi] = oi;
                        setAnswers(next);
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        sel
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          sel ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="inline-block align-middle"><MathText text={opt} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={submit}
            disabled={!allAnswered || busy}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
          >
            {busy ? "判分中…" : "提交（答对自动标记已复习）"}
          </button>
        </div>
      </div>
    );
  }

  if (questions && questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
        当前没有待复习的错题 🎉
        <button onClick={exit} className="ml-3 text-blue-600 hover:underline">
          返回
        </button>
      </div>
    );
  }

  // 入口按钮
  return (
    <button
      onClick={start}
      className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:from-orange-600 hover:to-amber-600"
    >
      🎯 开始复习错题（答对自动标记已复习）
    </button>
  );
}
