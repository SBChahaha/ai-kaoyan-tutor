import Link from "next/link";
import { listLessons, groupByChapter, getLesson, type LessonMeta } from "@/lib/course";
import { SUBJECT_COLORS } from "@/lib/config";
import { db } from "@/lib/db";
import { getLevelStates, hasQuiz, getBossQuizzes } from "@/lib/quiz";
import CourseIndexClient, { type LevelInfo } from "./CourseIndexClient";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const lessons = listLessons();
  const groups = groupByChapter(lessons);

  const subjects = new Map<string, { color: string; groups: typeof groups }>();
  for (const g of groups) {
    const s = subjects.get(g.subject) ?? { color: "", groups: [] };
    s.groups.push(g);
    subjects.set(g.subject, s);
  }

  // 闯关状态（含 BOSS 关）
  const levelStates = getLevelStates(
    lessons.map((l) => ({ slug: l.slug, title: l.title, subject: l.subject, chapter: l.chapter }))
  );
  const levels: Record<string, LevelInfo> = {};
  const bosses: Record<string, { slug: string; title: string; level: LevelInfo }> = {};
  for (const st of levelStates) {
    levels[st.slug] = {
      hasQuiz: st.hasQuiz,
      unlocked: st.unlocked,
      passed: st.passed,
      stars: st.stars,
      attempts: st.attempts,
      isBoss: !!st.isBoss,
    };
    if (st.isBoss && st.chapter) {
      bosses[st.chapter] = { slug: st.slug, title: st.title, level: levels[st.slug] };
    }
  }

  // 难点标记清单
  const flaggedRows = db
    .prepare("SELECT lesson_slug, flagged FROM progress WHERE flagged = 1")
    .all() as unknown as { lesson_slug: string }[];
  const flaggedList = flaggedRows
    .map((r) => lessons.find((l) => l.slug === r.lesson_slug))
    .filter((l): l is LessonMeta => !!l);

  // 搜索
  let searchResults: { slug: string; title: string; subject: string; snippet: string }[] = [];
  if (q && q.trim()) {
    const kw = q.trim().toLowerCase();
    for (const l of lessons) {
      const lesson = getLesson(l.slug);
      if (!lesson) continue;
      const idx = lesson.content.toLowerCase().indexOf(kw);
      if (idx >= 0 || l.title.toLowerCase().includes(kw)) {
        const start = Math.max(0, idx - 25);
        const snippet = idx >= 0 ? lesson.content.slice(start, start + 90).replace(/\n/g, " ") : "（标题匹配）";
        searchResults.push({ slug: l.slug, title: l.title, subject: l.subject, snippet: snippet + "…" });
        if (searchResults.length >= 15) break;
      }
    }
  }

  const total = lessons.length;
  const quizCount = lessons.filter((l) => hasQuiz(l.slug)).length;
  const bossCount = getBossQuizzes().length;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
        <h1 className="text-2xl font-bold">📖 11408 全程课</h1>
        <p className="mt-1 text-sm text-slate-300">
          数学一 → 408 → 英语一 → 政治 ｜ {total} 课 · {quizCount} 关 · {bossCount} 个综合关
        </p>
        {/* 搜索框 */}
        <form method="get" className="mt-3 flex max-w-md gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="🔍 搜索讲义内容（如：反函数、奇偶性）"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 搜索结果显示 */}
      {q && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            🔍 搜索"<span className="text-blue-600">{q}</span>"：{searchResults.length} 条结果
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-slate-400">没有找到相关内容，换个关键词试试</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/course/${encodeURIComponent(r.slug)}`}
                    className="block rounded-lg p-2 hover:bg-blue-50"
                  >
                    <span className="text-sm font-medium text-blue-700">
                      [{r.subject}] {r.title}
                    </span>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{r.snippet}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 难点清单 */}
      {flaggedList.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-red-700">
            📌 难点清单（{flaggedList.length} 个，标记后出现在这里，复习优先）
          </h2>
          <div className="flex flex-wrap gap-2">
            {flaggedList.map((l) => (
              <Link
                key={l.slug}
                href={`/course/${encodeURIComponent(l.slug)}`}
                className="rounded-full bg-white px-3 py-1 text-xs text-red-600 shadow-sm hover:bg-red-100"
              >
                {l.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <CourseIndexClient
        subjects={Array.from(subjects.entries()).map(([name, s]) => ({
          name,
          color: SUBJECT_COLORS[name]?.grad ?? "from-slate-500 to-slate-600",
          chapters: s.groups.map((g) => ({
            chapter: g.chapter,
            lessons: g.lessons.map((l: LessonMeta) => ({
              slug: l.slug,
              title: l.title,
              order: l.order,
            })),
          })),
        }))}
        levels={levels}
        bosses={bosses}
      />
    </div>
  );
}
