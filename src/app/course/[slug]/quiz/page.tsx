import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuiz } from "@/lib/quiz";
import { getLesson, listLessons } from "@/lib/course";
import { getAttempts, getLevelStates } from "@/lib/quiz";
import QuizClient from "./QuizClient";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lessonSlug = decodeURIComponent(slug);
  const quiz = getQuiz(lessonSlug);
  const lesson = getLesson(lessonSlug);
  if (!quiz) notFound();

  // 闯关解锁检查（仅对挂在课程链上的关卡；真题/独立关默认解锁）
  const states = getLevelStates(
    listLessons().map((l) => ({ slug: l.slug, title: l.title, subject: l.subject }))
  );
  const state = states.find((s) => s.slug === lessonSlug);
  if (lesson && state && state.hasQuiz && !state.unlocked) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold">关卡未解锁</h1>
        <p className="mt-2 text-sm text-slate-500">
          先通过上一关才能挑战本关——闯关模式就是不允许跳级 😎
        </p>
        <Link
          href="/course"
          className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          返回关卡地图
        </Link>
      </div>
    );
  }

  const title = lesson?.meta.title ?? quiz.title;

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-2xl">
        {lesson ? (
          <Link
            href={`/course/${encodeURIComponent(lessonSlug)}`}
            className="text-sm text-slate-500 hover:text-blue-600"
          >
            ← 返回讲义
          </Link>
        ) : (
          <Link href="/course" className="text-sm text-slate-500 hover:text-blue-600">
            ← 返回课程
          </Link>
        )}
        <h1 className="mt-1 text-xl font-bold">⚔️ {title}</h1>
        <p className="text-sm text-slate-500">
          每局随机抽一套变式 · 答对率和理解率都 ≥ {quiz.pass_percent}% 才算过关 · 全对 3 星
        </p>
      </div>
      <QuizClient lessonSlug={lessonSlug} passPercent={quiz.pass_percent} />
    </div>
  );
}
