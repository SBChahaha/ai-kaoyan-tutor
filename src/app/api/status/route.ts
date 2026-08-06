import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listLessons } from "@/lib/course";
import { computeBadges } from "@/lib/badges";
import { currentPhase } from "@/lib/config";

// 学习状态摘要：AI 检查入口
export async function GET() {
  const lessons = listLessons();
  const prog = db
    .prepare("SELECT lesson_slug, done FROM progress")
    .all() as unknown as { lesson_slug: string; done: number }[];

  const doneMap = new Map(prog.map((p) => [p.lesson_slug, !!p.done]));
  const doneCount = lessons.filter((l) => doneMap.get(l.slug)).length;

  // 按科目统计
  const bySubject: Record<string, { total: number; done: number }> = {};
  for (const l of lessons) {
    bySubject[l.subject] ??= { total: 0, done: 0 };
    bySubject[l.subject].total++;
    if (doneMap.get(l.slug)) bySubject[l.subject].done++;
  }

  const mistakes = db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending'").get() as {
    c: number;
  };
  // 逾期错题：待复习超过 3 天
  const overdueCutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const mistakesOverdue = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending' AND created_at < ?"
      )
      .get(overdueCutoff) as { c: number }
  ).c;
  const homework = db.prepare("SELECT COUNT(*) AS c FROM homework").get() as { c: number };
  const quiz = db
    .prepare(
      "SELECT COUNT(DISTINCT lesson_slug) AS c FROM quiz_attempts WHERE passed = 1"
    )
    .get() as { c: number };
  const quizAttempts = db.prepare("SELECT COUNT(*) AS c FROM quiz_attempts").get() as {
    c: number;
  };

  return NextResponse.json({
    app: "ai-kaoyan-tutor",
    generated_at: new Date().toISOString(),
    exam_date: "2026-12-19",
    progress: {
      total_lessons: lessons.length,
      done_lessons: doneCount,
      percent: lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0,
      by_subject: bySubject,
    },
    levels: {
      passed_levels: quiz.c,
      total_attempts: quizAttempts.c,
    },
    badges: computeBadges(),
    phase: currentPhase(),
    homework: { submitted: homework.c },
    mistakes: { pending: mistakes.c, overdue: mistakesOverdue },
    api: {
      lessons: "/api/course",
      progress: "/api/progress",
      homework: "/api/homework",
      quiz: "/api/quiz/[slug]",
      status: "/api/status",
    },
  });
}
