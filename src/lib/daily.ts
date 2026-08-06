// 每日回顾：从已过关课程的题库随机抽题，防遗忘（间隔复习简化版）
import { db, todayStr } from "@/lib/db";
import { getQuiz, pickVariant, type QuizQuestion } from "@/lib/quiz";
import { listLessons } from "@/lib/course";

export type DailyQuestion = {
  idx: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  lesson: string;
};

export function getPassedLessons(): string[] {
  const rows = db
    .prepare("SELECT lesson_slug FROM quiz_attempts WHERE passed = 1")
    .all() as unknown as { lesson_slug: string }[];
  return Array.from(new Set(rows.map((r) => r.lesson_slug)));
}

export function buildDailyReview(seed: number, count = 5): DailyQuestion[] {
  const passed = getPassedLessons();
  const pool: { lesson: string; q: QuizQuestion }[] = [];
  for (const slug of passed) {
    const quiz = getQuiz(slug);
    if (!quiz) continue;
    const { questions } = pickVariant(quiz, seed + slug.length * 7919);
    questions.forEach((q) => pool.push({ lesson: slug, q }));
  }
  if (pool.length === 0) return [];

  // 种子洗牌
  let a = seed >>> 0;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).map((p, i) => ({
    idx: i,
    question: p.q.question,
    options: p.q.type === "choice" ? p.q.options : [],
    answer: p.q.type === "choice" ? p.q.answer : 0,
    explanation: p.q.explanation,
    lesson: p.lesson,
  }));
}

export function isReviewDoneToday(): boolean {
  const r = db
    .prepare("SELECT COUNT(*) AS c FROM daily_review WHERE date = ?")
    .get(todayStr()) as { c: number };
  return r.c > 0;
}

export function getTodayReview(): { score: number; total: number } | null {
  const r = db
    .prepare("SELECT score, total FROM daily_review WHERE date = ? ORDER BY id DESC LIMIT 1")
    .get(todayStr()) as { score: number; total: number } | undefined;
  return r ?? null;
}
