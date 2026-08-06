"use client";

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
};

export default function CourseIndexClient({
  subjects,
  levels,
}: {
  subjects: Subject[];
  levels: Record<string, LevelInfo>;
}) {
  const quizLessons = subjects.flatMap((s) => s.chapters.flatMap((c) => c.lessons)).filter(
    (l) => levels[l.slug]?.hasQuiz
  );
  const passedCount = quizLessons.filter((l) => levels[l.slug]?.passed).length;
  const total = subjects.reduce(
    (a, s) => a + s.chapters.reduce((b, c) => b + c.lessons.length, 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* 总进度 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">
            🎮 闯关进度
            <span className="ml-2 text-slate-500">
              已通关 {passedCount}/{quizLessons.length} 关
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
          每课一关：读讲义 → 挑战 → 过关解锁下一关（🔒 未解锁 · ⚔️ 可挑战 · ⭐ 已通关）
        </p>
      </div>

      {subjects.map((s) => (
        <section key={s.name}>
          <div className={`rounded-t-2xl bg-gradient-to-r ${s.color} p-4 text-white`}>
            <h2 className="text-lg font-bold">{s.name}</h2>
          </div>
          <div className="space-y-4 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-4">
            {s.chapters.map((c) => (
              <div key={c.chapter}>
                <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{c.chapter}</h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {c.lessons.map((l) => {
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
                            href={
                              isQuiz && !passed
                                ? `/course/${encodeURIComponent(l.slug)}/quiz`
                                : `/course/${encodeURIComponent(l.slug)}`
                            }
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
                            挑战 →
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
