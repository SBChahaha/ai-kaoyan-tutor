import { NextRequest, NextResponse } from "next/server";
import { db, todayStr } from "@/lib/db";
import { buildDailyReview, isReviewDoneToday, getTodayReview, getPassedLessons } from "@/lib/daily";

export const runtime = "nodejs";

// GET：今日回顾（随机抽已过关课程题目，不含答案）
export async function GET() {
  const seed = Math.floor(Math.random() * 1e9);
  const questions = buildDailyReview(seed, 5);
  const done = isReviewDoneToday();
  const today = getTodayReview();
  return NextResponse.json({
    seed,
    done,
    today_result: today,
    passed_lessons: getPassedLessons().length,
    total: questions.length,
    questions: questions.map((q) => ({
      idx: q.idx,
      question: q.question,
      options: q.options,
      lesson: q.lesson,
    })),
  });
}

// POST：提交今日回顾
export async function POST(req: NextRequest) {
  const body = await req.json();
  const seed = Number(body.seed ?? 0);
  const answers = (body.answers ?? []) as number[];
  const questions = buildDailyReview(seed, 5);

  const results = questions.map((q, i) => {
    const given = answers[i];
    const correct = given !== undefined && given === q.answer;
    return {
      idx: q.idx,
      lesson: q.lesson,
      question: q.question,
      given: given ?? null,
      correct,
      correct_answer: q.options[q.answer] ?? "",
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO daily_review (date, score, total, created_at) VALUES (?, ?, ?, ?)"
  ).run(todayStr(), score, results.length, now);

  return NextResponse.json({
    score,
    total: results.length,
    results,
  });
}
