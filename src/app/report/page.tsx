import Link from "next/link";
import { db } from "@/lib/db";
import { listLessons } from "@/lib/course";
import { getLevelStates, hasQuiz, getBossQuizzes } from "@/lib/quiz";
import { computeBadges } from "@/lib/badges";
import { getPassedLessons } from "@/lib/daily";
import PrintButton from "@/app/components/PrintButton";

export const dynamic = "force-dynamic";

// 📊 学习报告页：一页看全所有数据（可打印）
export default async function ReportPage() {
  const lessons = listLessons();
  const states = getLevelStates(
    lessons.map((l) => ({ slug: l.slug, title: l.title, subject: l.subject, chapter: l.chapter }))
  );
  const passed = states.filter((s) => s.hasQuiz && s.passed);
  const threeStar = states.filter((s) => s.hasQuiz && s.stars >= 3);

  const logs = db.prepare("SELECT date, hours, content FROM logs ORDER BY date").all() as unknown as {
    date: string;
    hours: number;
    content: string;
  }[];
  const byDate = new Map<string, number>();
  for (const r of logs) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.hours);
  const totalHours = Math.round(logs.reduce((s, r) => s + r.hours, 0) * 10) / 10;

  const mistakes = db.prepare("SELECT * FROM mistakes").all() as unknown as {
    status: string;
    subject: string;
  }[];
  const pendingM = mistakes.filter((m) => m.status === "pending").length;
  const reviewedM = mistakes.filter((m) => m.status === "reviewed").length;
  const subjectMistakes = new Map<string, number>();
  for (const m of mistakes) subjectMistakes.set(m.subject, (subjectMistakes.get(m.subject) ?? 0) + 1);

  const attempts = db.prepare("SELECT COUNT(*) AS c FROM quiz_attempts").get() as { c: number };
  const reviewCount = (db.prepare("SELECT COUNT(*) AS c FROM daily_review").get() as { c: number }).c;
  const badges = computeBadges();
  const earnedBadges = badges.filter((b) => b.earned);

  // 本周 vs 上周
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const thisMonday = new Date(now.getTime() - mondayOffset * 86400000);
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const fmt2 = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const thisWeekHours = Math.round(
    logs.filter((r) => r.date >= fmt2(thisMonday)).reduce((s, r) => s + r.hours, 0) * 10
  ) / 10;
  const lastWeekHours =
    Math.round(
      logs
        .filter((r) => r.date >= fmt2(lastMonday) && r.date < fmt2(thisMonday))
        .reduce((s, r) => s + r.hours, 0) * 10
    ) / 10;
  const thisWeekPassed = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT lesson_slug) AS c FROM quiz_attempts WHERE passed = 1 AND created_at >= ?"
      )
      .get(thisMonday.toISOString()) as { c: number }
  ).c;

  const today = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const days: { date: string; hours: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push({ date: fmt(d), hours: Math.round((byDate.get(fmt(d)) ?? 0) * 10) / 10 });
  }
  const maxH = Math.max(1, ...days.map((d) => d.hours));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 学习报告</h1>
        <PrintButton />
      </div>

      {/* 核心数字 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalHours}</div>
          <div className="text-xs text-slate-500">累计学习（h）</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {passed.length}/{states.filter((s) => s.hasQuiz).length}
          </div>
          <div className="text-xs text-slate-500">已通关关卡</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{attempts.c}</div>
          <div className="text-xs text-slate-500">累计挑战次数</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{pendingM}</div>
          <div className="text-xs text-slate-500">待复习错题</div>
        </div>
      </div>

      {/* 本周 vs 上周 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{thisWeekHours}</div>
          <div className="text-xs text-slate-500">本周学习（h）</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-slate-600">{lastWeekHours}</div>
          <div className="text-xs text-slate-500">
            上周学习（h）
            {lastWeekHours > 0 && (
              <span className={thisWeekHours >= lastWeekHours ? "text-green-500" : "text-red-400"}>
                {" "}
                {thisWeekHours >= lastWeekHours ? "↑" : "↓"}
              </span>
            )}
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 text-center md:col-span-1">
          <div className="text-2xl font-bold text-emerald-600">{thisWeekPassed}</div>
          <div className="text-xs text-slate-500">本周通关（关）</div>
        </div>
      </div>

      {/* 30 天学习分布 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">近 30 天学习时长</h2>
        <div className="flex items-end gap-[3px]">
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.hours}h`}
              className={`flex-1 rounded-t ${d.hours > 0 ? "bg-blue-500" : "bg-slate-100"}`}
              style={{ height: `${Math.max(3, (d.hours / maxH) * 100)}px` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{days[0]?.date}</span>
          <span>今天</span>
        </div>
      </div>

      {/* 闯关明细 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">闯关明细</h2>
        <div className="flex flex-wrap gap-1.5">
          {states
            .filter((s) => s.hasQuiz)
            .map((s) => (
              <Link
                key={s.slug}
                href={`/course/${encodeURIComponent(s.slug)}`}
                title={s.title}
                className={`rounded-full px-3 py-1 text-xs ${
                  s.passed
                    ? "bg-green-100 text-green-700"
                    : s.unlocked
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {s.passed ? `✅ ${s.title} ★${s.stars}` : s.unlocked ? `⚔️ ${s.title}` : `🔒 ${s.title}`}
              </Link>
            ))}
        </div>
        {threeStar.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            ⭐ 全对 3 星通关：{threeStar.map((s) => s.title).join("、")}
          </p>
        )}
      </div>

      {/* 错题概况 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">错题本</h2>
        <p className="mb-3 text-sm text-slate-600">
          共 {mistakes.length} 道：待复习 {pendingM} · 已复习 {reviewedM} · 内容回顾已做 {reviewCount} 次
        </p>
        {subjectMistakes.size > 0 && (
          <div className="flex flex-wrap gap-3">
            {Array.from(subjectMistakes.entries()).map(([s, n]) => (
              <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {s}：{n} 道
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 成就 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          成就（{earnedBadges.length}/{badges.length}）
        </h2>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.id}
              className={`rounded-full px-3 py-1 text-xs ${
                b.earned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-300"
              }`}
            >
              {b.icon} {b.name}
            </span>
          ))}
        </div>
      </div>

      <p className="no-print text-center text-xs text-slate-400">
        生成于 {new Date().toLocaleString("zh-CN")} · 数据存在本地服务器（SQLite）
      </p>
    </div>
  );
}
