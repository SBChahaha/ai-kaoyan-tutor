"use client";

import { useState } from "react";
import Link from "next/link";

type Lesson = { slug: string; title: string; order: number };
type Chapter = { chapter: string; lessons: Lesson[] };
type Subject = { name: string; color: string; chapters: Chapter[] };
export type LevelInfo = {
  hasQuiz: boolean;
  unlocked: boolean;
  passed: boolean;
  stars: number;
  attempts: number;
  isBoss?: boolean;
};

export type ZhentiInfo = {
  slug: string;
  title: string;
  year: number;
  subject: string;
  pass_percent: number;
  stars: number;
  passed: boolean;
};

const MILESTONES = [5, 10, 25, 50, 100, 130];

export default function CourseIndexClient({
  subjects,
  levels,
  bosses,
  zhenti,
}: {
  subjects: Subject[];
  levels: Record<string, LevelInfo>;
  bosses: Record<string, { slug: string; title: string; level: LevelInfo }>;
  zhenti: ZhentiInfo[];
}) {
  const quizLessons = subjects
    .flatMap((s) => s.chapters.flatMap((c) => c.lessons))
    .filter((l) => levels[l.slug]?.hasQuiz);
  const passedCount = quizLessons.filter((l) => levels[l.slug]?.passed).length;
  const bossPassed = Object.values(bosses).filter((b) => b.level.passed).length;
  const bossTotal = Object.keys(bosses).length;
  const nextMilestone = MILESTONES.find((m) => m > passedCount) ?? null;
  const total = subjects.reduce(
    (a, s) => a + s.chapters.reduce((b, c) => b + c.lessons.length, 0),
    0
  );
  const [hidePassed, setHidePassed] = useState(false);
  const flaggedCount = Object.entries(levels).filter(
    ([, lv]) => lv.isBoss === undefined && lv.passed === false && lv.hasQuiz === false
  ).length; // 占位（难点清单在服务端渲染）

  return (
    <div className="space-y-8">
      {/* 总进度 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">
            🎮 闯关进度
            <span className="ml-2 text-slate-500">
              已通关 {passedCount}/{quizLessons.length} 关
              {bossTotal > 0 && (
                <span className="ml-1">
                  · 🔱 综合关 {bossPassed}/{bossTotal}
                </span>
              )}
            </span>
          </span>
          <span className="text-slate-400">讲义 {total - quizLessons.length} 篇</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
            style={{ width: `${quizLessons.length ? (passedCount / quizLessons.length) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          每课一关：读讲义 → 挑战 → 过关解锁下一关（🔒 未解锁 · ⚔️ 可挑战 · ⭐ 已通关 · 🔱 章节综合关）
          {nextMilestone && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
              🎯 距"通关 {nextMilestone} 关"还差 {nextMilestone - passedCount} 关
            </span>
          )}
        </p>
        {passedCount > 0 && (
          <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={hidePassed}
              onChange={(e) => setHidePassed(e.target.checked)}
              className="accent-blue-600"
            />
            只看未通关
          </label>
        )}
        {flaggedCount > 0 && (
          <p className="mt-1 text-xs text-red-400">📌 有 {flaggedCount} 个难点待复习（见上方清单）</p>
        )}
      </div>

      {subjects.map((s) => (
        <section key={s.name}>
          <div className={`rounded-t-2xl bg-gradient-to-r ${s.color} p-4 text-white`}>
            <h2 className="text-lg font-bold">{s.name}</h2>
          </div>
          <div className="space-y-4 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-4">
            {s.chapters.map((c) => {
              const boss = bosses[c.chapter];
              return (
                <div key={c.chapter}>
                  <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{c.chapter}</h3>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {c.lessons
                      .filter((l) => !hidePassed || !levels[l.slug]?.passed)
                      .map((l) => {
                      const lv = levels[l.slug];
                      const isQuiz = !!lv?.hasQuiz;
                      const locked = isQuiz && !lv.unlocked;
                      const passed = isQuiz && lv.passed;

                      return (
                        <li
                          key={l.slug}
                          className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                            locked
                              ? "border-slate-100 bg-slate-50 opacity-60"
                              : passed
                                ? "border-green-100 bg-green-50/50"
                                : "border-slate-100 hover:border-blue-200 hover:bg-blue-50/40"
                          }`}
                        >
                          <span className="w-6 shrink-0 text-center text-sm">
                            {locked ? "🔒" : passed ? "✅" : isQuiz ? "⚔️" : "📄"}
                          </span>
                          {locked ? (
                            <span className="flex-1 truncate text-sm text-slate-400">
                              {l.title}
                            </span>
                          ) : (
                            <Link
                              href={`/course/${encodeURIComponent(l.slug)}`}
                              className="flex-1 truncate text-sm text-slate-700 hover:text-blue-700"
                            >
                              {l.title}
                            </Link>
                          )}
                          {passed && (
                            <span className="shrink-0 text-sm text-amber-400">
                              {"★".repeat(lv.stars)}
                              <span className="text-slate-200">
                                {"★".repeat(Math.max(0, 3 - lv.stars))}
                              </span>
                            </span>
                          )}
                          {isQuiz && !passed && !locked && (
                            <span className="shrink-0 text-xs font-semibold text-blue-600">
                              学习 →
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {/* BOSS 综合关 */}
                    {boss && (
                      <li
                        className={`col-span-full mt-1 flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 ${
                          boss.level.unlocked
                            ? boss.level.passed
                              ? "border-purple-200 bg-purple-50"
                              : "border-purple-300 bg-purple-50/60 hover:border-purple-400"
                            : "border-slate-100 bg-slate-50 opacity-60"
                        }`}
                      >
                        <span className="text-lg">{boss.level.passed ? "🏆" : "🔱"}</span>
                        {boss.level.unlocked ? (
                          <Link
                            href={`/course/${encodeURIComponent(boss.slug)}`}
                            className="flex-1 text-sm font-semibold text-purple-800 hover:text-purple-600"
                          >
                            {boss.title}
                          </Link>
                        ) : (
                          <span className="flex-1 text-sm font-semibold text-slate-400">
                            {boss.title}（🔒 通关本章全部关卡后解锁）
                          </span>
                        )}
                        {boss.level.passed && (
                          <span className="shrink-0 text-sm text-amber-400">
                            {"★".repeat(boss.level.stars)}
                          </span>
                        )}
                        {boss.level.unlocked && !boss.level.passed && (
                          <span className="shrink-0 text-xs font-semibold text-purple-600">
                            挑战 →
                          </span>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* 真题专项 */}
      {zhenti.length > 0 && (
        <section>
          <div className="rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
            <h2 className="text-lg font-bold">📜 真题专项</h2>
            <p className="text-xs text-emerald-100">
              历年真题（改编）· 独立于闯关链 · 随时可练 · 通过线 {zhenti[0].pass_percent}%
            </p>
          </div>
          <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-4">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {zhenti.map((z) => (
                <li
                  key={z.slug}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                    z.passed
                      ? "border-green-100 bg-green-50/50"
                      : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40"
                  }`}
                >
                  <span className="text-sm">📜</span>
                  <Link
                    href={`/course/${encodeURIComponent(z.slug)}/quiz`}
                    className="flex-1 truncate text-sm text-slate-700 hover:text-emerald-700"
                  >
                    {z.title}
                    <span className="ml-1 text-xs text-slate-400">
                      {z.year} · {z.subject}
                    </span>
                  </Link>
                  {z.passed && (
                    <span className="shrink-0 text-sm text-amber-400">
                      {"★".repeat(z.stars)}
                    </span>
                  )}
                  {!z.passed && (
                    <span className="shrink-0 text-xs font-semibold text-emerald-600">
                      去练习 →
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
