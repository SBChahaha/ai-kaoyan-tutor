import { NextRequest, NextResponse } from "next/server";
import { getQuiz, checkAnswer, calcStars, getAttempts } from "@/lib/quiz";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

// GET：题目列表（不含答案）+ 历史尝试
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const quiz = getQuiz(decodeURIComponent(slug));
  if (!quiz) return NextResponse.json({ error: "该课程没有关卡" }, { status: 404 });

  const questions = quiz.questions.map((q) =>
    q.type === "choice"
      ? { type: q.type, question: q.question, options: q.options }
      : { type: q.type, question: q.question }
  );
  const attempts = getAttempts(decodeURIComponent(slug)).map((a) => ({
    id: a.id,
    score: a.score,
    total: a.total,
    percent: a.percent,
    stars: a.stars,
    passed: !!a.passed,
    created_at: a.created_at,
  }));

  return NextResponse.json({
    lesson: quiz.lesson,
    pass_percent: quiz.pass_percent,
    total: questions.length,
    questions,
    attempts,
  });
}

// POST：提交作答，服务端判分，记录闯关
export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const quiz = getQuiz(decodeURIComponent(slug));
  if (!quiz) return NextResponse.json({ error: "该课程没有关卡" }, { status: 404 });

  const body = await req.json();
  const answers = (body.answers ?? []) as (string | number | null)[];

  const results = quiz.questions.map((q, i) => {
    const given = answers[i] ?? null;
    const correct = checkAnswer(q, given);
    return {
      index: i,
      type: q.type,
      question: q.question,
      given,
      correct,
      // 提交后展示正确答案与解析（学习用途）
      correct_answer:
        q.type === "choice" ? q.options[q.answer] : q.answer.join(" 或 "),
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const total = quiz.questions.length;
  const percent = Math.round((score / total) * 100);
  const passPercent = quiz.pass_percent ?? 70;
  const stars = calcStars(percent, passPercent);
  const passed = percent >= passPercent;

  const r = db
    .prepare(
      `INSERT INTO quiz_attempts (lesson_slug, score, total, percent, stars, passed, answers, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      decodeURIComponent(slug),
      score,
      total,
      percent,
      stars,
      passed ? 1 : 0,
      JSON.stringify(answers),
      new Date().toISOString()
    );

  // 过关自动标记"已学"
  if (passed) {
    db.prepare(
      `INSERT INTO progress (lesson_slug, done, updated_at) VALUES (?, 1, ?)
       ON CONFLICT(lesson_slug) DO UPDATE SET done = 1, updated_at = excluded.updated_at`
    ).run(decodeURIComponent(slug), new Date().toISOString());
  }

  return NextResponse.json({
    attempt_id: Number(r.lastInsertRowid),
    score,
    total,
    percent,
    stars,
    passed,
    pass_percent: passPercent,
    results,
  });
}
