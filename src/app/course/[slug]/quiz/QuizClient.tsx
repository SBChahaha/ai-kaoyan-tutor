"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MathText from "../../../components/MathText";
import SymbolPalette from "../../../components/SymbolPalette";

type Q = { type: "choice" | "fill"; question: string; options?: string[] };
type Result = {
  index: number;
  type: string;
  question: string;
  given: string | number | null;
  correct: boolean;
  correct_answer: string;
  explanation: string;
  needs_explanation: boolean;
  explain_ok: boolean | null;
  guessed: boolean;
};

export default function QuizClient({
  lessonSlug,
  passPercent,
}: {
  lessonSlug: string;
  passPercent: number;
}) {
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [variantIndex, setVariantIndex] = useState(0);
  const [variantCount, setVariantCount] = useState(1);
  const [seed, setSeed] = useState(0);
  const [attempts, setAttempts] = useState<
    { id: number; score: number; total: number; percent: number; stars: number; passed: boolean; created_at: string }[]
  >([]);

  const [answers, setAnswers] = useState<(string | number | null)[]>([]);
  const [explanations, setExplanations] = useState<(string | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<Result[] | null>(null);
  const [summary, setSummary] = useState<{
    score: number;
    total: number;
    percent: number;
    explain_rate: number;
    explain_note: string;
    stars: number;
    passed: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/${encodeURIComponent(lessonSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions);
        setVariantIndex(d.variant_index);
        setVariantCount(d.variant_count);
        setSeed(d.seed);
        setAnswers(d.questions.map(() => null));
        setExplanations(d.questions.map(() => null));
        setAttempts(d.attempts ?? []);
      })
      .catch(() => setQuestions([]));
  }, [lessonSlug]);

  if (!questions) {
    return <div className="p-10 text-center text-slate-400">加载关卡…</div>;
  }
  if (questions.length === 0) {
    return <div className="p-10 text-center text-slate-400">关卡加载失败，请刷新重试</div>;
  }

  const q = questions[current];
  const isChoice = q.type === "choice";
  const answerGiven = answers[current] !== null && answers[current] !== "";
  const explainGiven = (explanations[current] ?? "").trim().length > 0;
  const allAnswered = answers.every((a) => a !== null && a !== "");
  const allExplained = questions.every(
    (qq, i) => qq.type !== "choice" || ((explanations[i] ?? "").trim().length > 0 && answers[i] !== null)
  );

  function choose(optIdx: number) {
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
  }

  function setFill(v: string) {
    const next = [...answers];
    next[current] = v;
    setAnswers(next);
  }

  async function submit() {
    if (!allAnswered || !allExplained || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/quiz/${encodeURIComponent(lessonSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, answers, explanations }),
      });
      const d = await r.json();
      setResult(d.results);
      setSummary({
        score: d.score,
        total: d.total,
        percent: d.percent,
        explain_rate: d.explain_rate,
        explain_note: d.explain_note ?? "",
        stars: d.stars,
        passed: d.passed,
      });
      setAttempts((a) => [
        {
          id: d.attempt_id,
          score: d.score,
          total: d.total,
          percent: d.percent,
          stars: d.stars,
          passed: d.passed,
          created_at: new Date().toISOString(),
        },
        ...a,
      ]);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    window.location.reload(); // 重新抽变式
  }

  const stars = summary?.stars ?? 0;

  // ===== 结果页 =====
  if (summary && result) {
    const guessedCount = result.filter((r) => r.guessed).length;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <div className="text-5xl">{summary.passed ? "🎉" : "💪"}</div>
          <h1 className="mt-3 text-2xl font-bold">
            {summary.passed ? "过关！" : "差一点，再试一次"}
          </h1>
          <div className="mt-2 text-3xl tracking-wider text-amber-400">
            {"★".repeat(stars)}
            <span className="text-slate-200">{"★".repeat(3 - stars)}</span>
          </div>
          <p className="mt-2 text-slate-600">
            答对 {summary.score}/{summary.total}（{summary.percent}%）· 理解率 {summary.explain_rate}%
            · 通过线 {passPercent}%（两项都要达标）
          </p>
          {guessedCount > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">
              ⚠️ 有 {guessedCount} 题答对了但解释不过关——按"蒙对"处理。真懂的话，去重做一遍
            </p>
          )}
          {summary.explain_note && (
            <p className="mt-1 text-xs text-slate-400">{summary.explain_note}</p>
          )}
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={retry}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {summary.passed ? "再抽一套（冲 3 星）" : "重新挑战（换一套题）"}
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
                r.guessed ? "border-amber-300" : r.correct ? "border-green-200" : "border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                    r.guessed ? "bg-amber-500" : r.correct ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {r.guessed ? "?" : r.correct ? "✓" : "✗"}
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
                  <p className="mt-1 text-green-700">正确答案：{r.correct_answer}</p>
                  {r.guessed && (
                    <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-amber-700">
                      🧐 答对了但解释不到位——这题你其实是蒙的，回头把推理过程想清楚
                    </p>
                  )}
                  {r.needs_explanation && !r.guessed && (
                    <p
                      className={`mt-1 text-xs ${
                        r.explain_ok ? "text-green-600" : "text-slate-400"
                      }`}
                    >
                      理解判定：{r.explain_ok ? "✓ 解释到位" : "未判分"}
                    </p>
                  )}
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
  const needExplain = isChoice && answerGiven && !explainGiven;

  return (
    <div className="mx-auto max-w-2xl">
      {/* 进度条 + 变式提示 */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">
            第 {current + 1}/{questions.length} 题
          </span>
          <span className="text-xs text-slate-400">
            变式 {variantIndex + 1}/{variantCount}（每局随机）· 通过线 {passPercent}%
          </span>
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
          {isChoice ? "选择题" : "填空题"}
        </span>
        <div className="mt-3 text-lg font-semibold leading-relaxed text-slate-800">
          <MathText text={q.question} />
        </div>

        {isChoice ? (
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
            {/* 解释框：防蒙核心 */}
            {answerGiven && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="mb-1.5 text-xs font-semibold text-amber-700">
                  🧠 为什么选它？（必填：写出你的推理，AI 会判定你是否真懂）
                </p>
                <textarea
                  value={explanations[current] ?? ""}
                  onChange={(e) => {
                    const next = [...explanations];
                    next[current] = e.target.value;
                    setExplanations(next);
                  }}
                  rows={2}
                  placeholder="例如：因为 f(-x) = -f(x) 且定义域关于原点对称…"
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                直接输入即可：x&lt;1或x&gt;2、sqrt(2)、3/2 都行
              </p>
              <SymbolPalette
                onInsert={(s) => {
                  const next = [...answers];
                  next[current] = (answers[current] as string ?? "") + s;
                  setAnswers(next);
                }}
              />
            </div>
            <input
              value={(answers[current] as string) ?? ""}
              onChange={(e) => setFill(e.target.value)}
              placeholder="输入你的答案…"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
        )}

        {needExplain && (
          <p className="mt-2 text-xs text-amber-600">⚠️ 这道题需要先填写"为什么选它"才能继续</p>
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
              disabled={!answerGiven || needExplain}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              下一题 →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!allAnswered || !allExplained || busy}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
            >
              {busy ? "判分中…" : "提交判分（答案+理解）"}
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
