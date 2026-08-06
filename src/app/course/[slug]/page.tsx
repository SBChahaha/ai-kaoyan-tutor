import { notFound } from "next/navigation";
import Link from "next/link";
import { getLesson, listLessons } from "@/lib/course";
import { SUBJECT_COLORS } from "@/lib/config";
import { db } from "@/lib/db";
import { getLevelStates, getQuiz } from "@/lib/quiz";
import LessonViewer from "./LessonViewer";
import QuizClient from "./quiz/QuizClient";

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
    .prepare("SELECT done, flagged FROM progress WHERE lesson_slug = ?")
    .get(lesson.meta.slug) as { done: number; flagged: number } | undefined;
  const initialDone = !!prog?.done;
  const initialFlagged = !!prog?.flagged;

  const hw = null as null; // 作业组件已移除，测试内嵌在课程页

  // 关卡状态（决定挑战按钮）
  const states = getLevelStates(
    listLessons().map((l) => ({ slug: l.slug, title: l.title, subject: l.subject }))
  );
  const level = states.find((s) => s.slug === lesson.meta.slug);
  const quiz = getQuiz(lesson.meta.slug);

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
        <div className="mt-2">
          <h1 className="text-2xl font-bold">{lesson.meta.title}</h1>
          {lesson.mtime && (
            <div className="mt-0.5 text-xs text-slate-400">
              更新于 {lesson.mtime.slice(0, 10)} {lesson.mtime.slice(11, 16)}
            </div>
          )}
        </div>
      </div>

      {/* 📖 课程讲解（讲义） */}
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white">
          📖 课程讲解
        </span>
        <span className="text-sm text-slate-500">本课全部知识点的完整讲解与证明</span>
      </div>
      <LessonViewer
        slug={lesson.meta.slug}
        content={lesson.content}
        prev={prev ? { slug: prev.slug, title: prev.title, subject: prev.subject } : null}
        next={next ? { slug: next.slug, title: next.title, subject: next.subject } : null}
        initialDone={initialDone}
        initialFlagged={initialFlagged}
      />

      {/* 过渡分隔 */}
      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">📚 讲义结束 · 完成下方测试即可过关</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* 内嵌过关测试（纯选择题） */}
      {quiz && level?.hasQuiz && level.unlocked && (
        <section className="mt-10 rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-6">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold text-amber-800">🎯 本课过关测试（选择题）</h2>
            <p className="mt-1 text-sm text-amber-700/80">
              共 {quiz.variants[0].length} 题 · 每局随机抽一套变式 · 答对率和理解率都 ≥{" "}
              {quiz.pass_percent}% 过关 · 全对 3 星
            </p>
          </div>
          <QuizClient lessonSlug={lesson.meta.slug} passPercent={quiz.pass_percent} />
        </section>
      )}
    </div>
  );
}
