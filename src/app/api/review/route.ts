import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildReviewQuestions } from "@/lib/review";

export const runtime = "nodejs";

// GET：生成复习测试（不含答案）
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 8);
  const questions = buildReviewQuestions(limit);
  const pending = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending'").get() as { c: number }
  ).c;
  return NextResponse.json({
    pending,
    total: questions.length,
    questions: questions.map((q) => ({
      mistake_id: q.mistake_id,
      question: q.question,
      options: q.options,
    })),
  });
}

// POST：提交复习作答，答对自动标记已复习
export async function POST(req: NextRequest) {
  const body = await req.json();
  const answers = (body.answers ?? []) as number[];
  const questions = buildReviewQuestions(Number(body.limit ?? 8));

  const results = questions.map((q, i) => {
    const given = answers[i];
    const correct = given !== undefined && given === q.answer;
    if (correct) {
      // 答对：复习次数 +1，进入下一个艾宾浩斯间隔
      db.prepare(
        "UPDATE mistakes SET status = 'reviewed', review_count = review_count + 1, last_reviewed_at = ? WHERE id = ?"
      ).run(new Date().toISOString(), q.mistake_id);
    } else {
      // 答错：回炉待复习，间隔重新计（从 1 天开始）
      db.prepare(
        "UPDATE mistakes SET status = 'pending', review_count = 0, last_reviewed_at = ? WHERE id = ?"
      ).run(new Date().toISOString(), q.mistake_id);
    }
    return {
      mistake_id: q.mistake_id,
      question: q.question,
      given: given ?? null,
      correct,
      correct_answer: q.options[q.answer],
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const remaining = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending'").get() as { c: number }
  ).c;

  return NextResponse.json({
    score,
    total: results.length,
    percent: results.length ? Math.round((score / results.length) * 100) : 100,
    remaining,
    results,
  });
}
