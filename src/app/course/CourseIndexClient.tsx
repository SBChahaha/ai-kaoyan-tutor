"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Lesson = { slug: string; title: string; order: number };
type Chapter = { chapter: string; lessons: Lesson[] };
type Subject = { name: string; color: string; chapters: Chapter[] };

export default function CourseIndexClient({
  subjects,
  initialProgress,
}: {
  subjects: Subject[];
  initialProgress: Record<string, boolean>;
}) {
  const [progress, setProgress] = useState<Record<string, boolean>>(initialProgress);

  async function toggle(slug: string) {
    const next = { ...progress, [slug]: !progress[slug] };
    setProgress(next);
    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_slug: slug, done: next[slug] }),
      });
    } catch {
      setProgress(progress); // 失败回滚
    }
  }

  const total = subjects.reduce(
    (a, s) => a + s.chapters.reduce((b, c) => b + c.lessons.length, 0),
    0
  );
  const done = Object.values(progress).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* 总进度 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">总进度</span>
          <span className="text-slate-500">
            {done}/{total} 课 · {pct}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {subjects.map((s) => {
        const sTotal = s.chapters.reduce((a, c) => a + c.lessons.length, 0);
        const sDone = s.chapters.reduce(
          (a, c) => a + c.lessons.filter((l) => progress[l.slug]).length,
          0
        );
        return (
          <section key={s.name}>
            <div className={`rounded-t-2xl bg-gradient-to-r ${s.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{s.name}</h2>
                <span className="text-sm text-white/85">
                  {sDone}/{sTotal} 课
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${sTotal ? (sDone / sTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-4 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-4">
              {s.chapters.map((c) => (
                <div key={c.chapter}>
                  <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{c.chapter}</h3>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {c.lessons.map((l) => {
                      const isDone = !!progress[l.slug];
                      return (
                        <li key={l.slug} className="flex items-center gap-2">
                          <button
                            onClick={() => toggle(l.slug)}
                            title={isDone ? "标记未学" : "标记已学"}
                            className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[10px] ${
                              isDone
                                ? "border-green-500 bg-green-500 text-white"
                                : "border-slate-300 text-transparent hover:border-green-400"
                            }`}
                          >
                            ✓
                          </button>
                          <Link
                            href={`/course/${encodeURIComponent(l.slug)}`}
                            className={`flex-1 truncate rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 ${
                              isDone ? "text-slate-400 line-through" : "text-slate-700"
                            }`}
                          >
                            {l.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
