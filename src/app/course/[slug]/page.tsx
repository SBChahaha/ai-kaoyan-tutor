import { notFound } from "next/navigation";
import Link from "next/link";
import { getLesson, listLessons } from "@/lib/course";
import { SUBJECT_COLORS } from "@/lib/config";
import { db } from "@/lib/db";
import { getLevelStates } from "@/lib/quiz";
import LessonViewer from "./LessonViewer";
import type { HomeworkItem } from "./HomeworkWidget";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(decodeURIComponent(slug));
  if (!lesson) notFound();

  const all = listLessons();
  const idx = all.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const color = SUBJECT_COLORS[lesson.meta.subject];

  // 服务器端进度 + 作业（AI 可查）
  const prog = db
    .prepare("SELECT done FROM progress WHERE lesson_slug = ?")
    .get(lesson.meta.slug) as { done: number } | undefined;
  const initialDone = !!prog?.done;

  const hw = db
    .prepare("SELECT * FROM homework WHERE lesson_slug = ? ORDER BY question_index")
    .all(lesson.meta.slug) as unknown as HomeworkItem[];

  // 关卡状态（决定挑战按钮）
  const states = getLevelStates(
    listLessons().map((l) => ({ slug: l.slug, title: l.title, subject: l.subject }))
  );
  const level = states.find((s) => s.slug === lesson.meta.slug);

  return (
    <div>
      {/* 顶部信息 */}
      <div className="mb-6 border-b border-slate-200 pb-4">
        <Link href="/course" className="text-sm text-slate-500 hover:text-blue-600">
          ← 课程目录
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${color?.badge ?? "bg-slate-100 text-slate-600"}`}
          >
            {lesson.meta.subject}
          </span>
          <span className="text-sm text-slate-500">{lesson.meta.chapter}</span>
          {level?.hasQuiz && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {level.passed ? `已通关 ${"★".repeat(level.stars)}` : level.unlocked ? "⚔️ 可挑战" : "🔒 未解锁"}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{lesson.meta.title}</h1>
          {level?.hasQuiz && level.unlocked && !level.passed && (
            <Link
              href={`/course/${encodeURIComponent(lesson.meta.slug)}/quiz`}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
            >
              ⚔️ 开始挑战
            </Link>
          )}
          {level?.hasQuiz && level.passed && (
            <Link
              href={`/course/${encodeURIComponent(lesson.meta.slug)}/quiz`}
              className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
            >
              🏆 冲 3 星（当前 {"★".repeat(level.stars)}）
            </Link>
          )}
        </div>
      </div>

      <LessonViewer
        slug={lesson.meta.slug}
        content={lesson.content}
        prev={prev ? { slug: prev.slug, title: prev.title, subject: prev.subject } : null}
        next={next ? { slug: next.slug, title: next.title, subject: next.subject } : null}
        initialDone={initialDone}
        initialHomework={hw}
      />
    </div>
  );
}
