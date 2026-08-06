import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listLessons } from "@/lib/course";
import { getLevelStates } from "@/lib/quiz";
import { isReviewDoneToday } from "@/lib/daily";

// 智能推荐：下一课 + 今日待办
export async function GET() {
  const lessons = listLessons();
  const states = getLevelStates(
    lessons.map((l) => ({ slug: l.slug, title: l.title, subject: l.subject, chapter: l.chapter }))
  );

  // 第一个已解锁未过关的关卡
  const nextLevel = states.find((s) => s.hasQuiz && s.unlocked && !s.passed && !s.isBoss);
  const nextLesson = nextLevel
    ? { slug: nextLevel.slug, title: nextLevel.title, subject: nextLevel.subject }
    : null;

  const pendingMistakes = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending'").get() as { c: number }
  ).c;
  const flagged = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE flagged = 1").get() as { c: number }
  ).c;
  const dailyReviewDone = isReviewDoneToday();

  return NextResponse.json({
    next_lesson: nextLesson,
    pending_mistakes: pendingMistakes,
    flagged_lessons: flagged,
    daily_review_done: dailyReviewDone,
    suggestions: [
      nextLesson ? { type: "lesson", text: `学习《${nextLesson.title}》并过关` } : null,
      pendingMistakes > 0 ? { type: "review", text: `复习错题本 ${pendingMistakes} 道（答对自动标记）` } : null,
      !dailyReviewDone ? { type: "daily", text: "完成今日回顾（随机 5 题）" } : null,
      flagged > 0 ? { type: "flag", text: `重看 ${flagged} 个标记的难点章节` } : null,
    ].filter(Boolean),
  });
}
