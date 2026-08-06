import Link from "next/link";
import { listLessons, groupByChapter, type LessonMeta } from "@/lib/course";
import { SUBJECT_COLORS } from "@/lib/config";
import { db } from "@/lib/db";
import CourseIndexClient from "./CourseIndexClient";

export const dynamic = "force-dynamic";

export default function CoursePage() {
  const lessons = listLessons();
  const groups = groupByChapter(lessons);

  const subjects = new Map<string, { color: string; groups: typeof groups }>();
  for (const g of groups) {
    const s = subjects.get(g.subject) ?? { color: "", groups: [] };
    s.groups.push(g);
    subjects.set(g.subject, s);
  }

  // 服务器端读取进度（AI 可查）
  const progRows = db.prepare("SELECT lesson_slug, done FROM progress").all() as unknown as {
    lesson_slug: string;
    done: number;
  }[];
  const initialProgress: Record<string, boolean> = {};
  for (const p of progRows) initialProgress[p.lesson_slug] = !!p.done;

  const total = lessons.length;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
        <h1 className="text-2xl font-bold">📖 11408 全程课</h1>
        <p className="mt-1 text-sm text-slate-300">
          数学一 → 408 → 英语一 → 政治 ｜ 共 {total} 课 ｜ 大纲见{" "}
          <a
            href="https://github.com/SBChahaha/ai-kaoyan-tutor/blob/main/content/curriculum.md"
            target="_blank"
            className="underline hover:text-white"
          >
            curriculum.md
          </a>
        </p>
        <p className="mt-2 text-xs text-slate-400">
          学完一课点"标记已学"，进度保存在服务器，AI 可随时检查
        </p>
      </div>

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
        initialProgress={initialProgress}
      />
    </div>
  );
}
