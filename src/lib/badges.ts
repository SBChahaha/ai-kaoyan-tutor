// 成就徽章：从学习数据实时计算
import { db, getSetting } from "@/lib/db";
import { listLessons } from "@/lib/course";
import { getQuiz } from "@/lib/quiz";
import { getPassedLessons } from "@/lib/daily";

export type Badge = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  earned: boolean;
};

export function computeBadges(): Badge[] {
  const passed = getPassedLessons();
  const passedSet = new Set(passed);

  // 全关卡 3 星
  const quizLessons = listLessons().filter((l) => getQuiz(l.slug));
  let threeStarCount = 0;
  let allThreeStar = quizLessons.length > 0;
  for (const l of quizLessons) {
    const best = db
      .prepare("SELECT MAX(stars) AS m FROM quiz_attempts WHERE lesson_slug = ?")
      .get(l.slug) as { m: number | null };
    if ((best.m ?? 0) >= 3) threeStarCount++;
    else if ((best.m ?? 0) < 1) allThreeStar = false;
  }
  if (threeStarCount < quizLessons.length) allThreeStar = false;

  const reviewed = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'reviewed'").get() as {
      c: number;
    }
  ).c;
  const homework = (db.prepare("SELECT COUNT(*) AS c FROM homework").get() as { c: number }).c;

  // 连续天数
  const logs = db.prepare("SELECT date, hours FROM logs").all() as unknown as {
    date: string;
    hours: number;
  }[];
  const byDate = new Map<string, number>();
  for (const r of logs) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.hours);
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const today = new Date();
  let cursor = new Date(today.getTime());
  if ((byDate.get(fmt(cursor)) ?? 0) <= 0) cursor = new Date(today.getTime() - 86400000);
  let streak = 0;
  while ((byDate.get(fmt(cursor)) ?? 0) > 0) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  const totalHours = Math.round(
    logs.reduce((s, r) => s + r.hours, 0)
  );
  const _ = getSetting("daily_target", "8");

  return [
    { id: "first", name: "首战告捷", icon: "🏅", desc: "通过第 1 个关卡", earned: passedSet.has("01-函数的概念与性质") || passed.length >= 1 },
    { id: "three_star", name: "三星闪耀", icon: "⭐", desc: "任意一关拿到 3 星", earned: threeStarCount >= 1 },
    { id: "scholar", name: "学有所成", icon: "📚", desc: "累计通过 5 个关卡", earned: passed.length >= 5 },
    { id: "week", name: "七日之约", icon: "🔥", desc: "连续学习 7 天", earned: streak >= 7 },
    { id: "cleaner", name: "错题清道夫", icon: "🧹", desc: "累计复习 10 道错题", earned: reviewed >= 10 },
    { id: "hardworker", name: "勤学不辍", icon: "💪", desc: "累计学习 20 小时", earned: totalHours >= 20 },
    { id: "ai_explorer", name: "AI 探索者", icon: "🤖", desc: "提交过 1 次 AI 批改作业", earned: homework >= 1 },
    { id: "perfectionist", name: "完美主义者", icon: "🎯", desc: "全部关卡 3 星通关", earned: allThreeStar },
  ];
}
