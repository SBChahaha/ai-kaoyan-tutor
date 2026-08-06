import Link from "next/link";
import { db, todayStr } from "@/lib/db";
import { EXAM_DATE } from "@/lib/config";
import { listLessons } from "@/lib/course";
import { getLevelStates } from "@/lib/quiz";
import TodayPlans from "./components/TodayPlans";
import TodayStats from "./components/TodayStats";
import DailyReviewCard from "./components/DailyReviewCard";
import BadgesRow from "./components/BadgesRow";
import PomodoroCard from "./components/PomodoroCard";
import BackupRestore from "./components/BackupRestore";
import QuickAsk from "./components/QuickAsk";
import BadgeToast from "./components/BadgeToast";
import Collapsible from "./components/Collapsible";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const today = todayStr();
  const daysLeft = Math.ceil(
    (new Date(EXAM_DATE).getTime() - new Date(today).getTime()) / 86400000
  );

  const noteCount = (db.prepare("SELECT COUNT(*) AS c FROM notes").get() as { c: number }).c;
  const mistakeCount = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes").get() as { c: number }
  ).c;
  const pendingMistakes = (
    db.prepare("SELECT COUNT(*) AS c FROM mistakes WHERE status = 'pending'").get() as {
      c: number;
    }
  ).c;

  // 课程进度（服务器端，AI 可查）
  const lessonTotal = listLessons().length;
  const lessonDone = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE done = 1").get() as { c: number }
  ).c;
  const homeworkCount = (
    db.prepare("SELECT COUNT(*) AS c FROM homework").get() as { c: number }
  ).c;

  // 最近 7 天学习时长
  const weekAgo = new Date(Date.now() - 6 * 86400000);
  const p = (n: number) => String(n).padStart(2, "0");
  const weekAgoStr = `${weekAgo.getFullYear()}-${p(weekAgo.getMonth() + 1)}-${p(weekAgo.getDate())}`;
  const weekHours = (
    db
      .prepare("SELECT COALESCE(SUM(hours), 0) AS s FROM logs WHERE date >= ?")
      .get(weekAgoStr) as { s: number }
  ).s;

  // 继续学习：第一个已解锁未通关的关卡
  const lessons = listLessons();
  const levelStates = getLevelStates(
    lessons.map((l) => ({ slug: l.slug, title: l.title, subject: l.subject, chapter: l.chapter }))
  );
  const nextLevel = levelStates.find((s) => s.hasQuiz && s.unlocked && !s.passed && !s.isBoss);

  return (
    <div className="space-y-6">
      {/* 快速提问 */}
      <QuickAsk />
      <BadgeToast />

      {/* 倒计时横幅 */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-blue-100">距离 2027 考研初试（{EXAM_DATE}）还有</div>
            <div className="mt-1 text-5xl font-bold">{daysLeft}</div>
            <div className="mt-1 text-sm text-blue-100">天 — 今天也要加油 💪</div>
          </div>
          <div className="flex gap-3 text-sm">
            {nextLevel && (
              <Link
                href={`/course/${encodeURIComponent(nextLevel.slug)}`}
                className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300"
              >
                ▶ 继续学习：{nextLevel.title}
              </Link>
            )}
            <Link
              href="/course"
              className="rounded-lg bg-white/15 px-4 py-2 hover:bg-white/25"
            >
              📚 去学习
            </Link>
            <Link href="/chat" className="rounded-lg bg-white/15 px-4 py-2 hover:bg-white/25">
              🤖 AI 答疑
            </Link>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/course" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300">
          <div className="text-xs text-slate-500">课程进度</div>
          <div className="mt-1 text-2xl font-bold">
            {lessonDone}
            <span className="text-sm font-normal text-slate-400">/{lessonTotal} 课</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${lessonTotal ? Math.round((lessonDone / lessonTotal) * 100) : 0}%` }}
            />
          </div>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">已交作业</div>
          <div className="mt-1 text-2xl font-bold">{homeworkCount} 题</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">待复习错题</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">{pendingMistakes}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">近 7 天学习</div>
          <div className="mt-1 text-2xl font-bold">{weekHours} h</div>
        </div>
      </div>

      {/* 今日计划 + 学习统计 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Collapsible id="plans" title="📋 学习清单">
          <TodayPlans />
        </Collapsible>
        <Collapsible id="stats" title="🔥 学习统计">
          <TodayStats />
        </Collapsible>
      </div>

      {/* 每日回顾 + 成就 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Collapsible id="review" title="📚 回顾已学内容">
          <DailyReviewCard />
        </Collapsible>
        <Collapsible id="badges" title="🏆 成就">
          <BadgesRow />
        </Collapsible>
      </div>

      {/* 番茄钟 */}
      <Collapsible id="pomodoro" title="🍅 专注计时器">
        <PomodoroCard />
      </Collapsible>

      {/* 页脚 */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-400">
        <span>
          距离初试还有 <b className="text-slate-600">{daysLeft}</b> 天 · 坚持就是胜利
        </span>
        <div className="flex items-center gap-3">
          <BackupRestore />
          <a href="/api/backup" className="hover:text-blue-600" title="导出全部学习数据备份">
            💾 数据备份
          </a>
          <a href="/api/export?type=logs" className="hover:text-blue-600" title="学习日志 CSV">
            📄 导出 CSV
          </a>
        </div>
      </div>
    </div>
  );
}
