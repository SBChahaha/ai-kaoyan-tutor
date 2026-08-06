"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import HomeworkWidget, { type HomeworkItem } from "./HomeworkWidget";

type Nav = { slug: string; title: string; subject: string } | null;

// 与 markdown 渲染一致的锚点 id 生成（github-slugger 风格）
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LessonViewer({
  slug,
  content,
  prev,
  next,
  initialDone,
  initialHomework,
}: {
  slug: string;
  content: string;
  prev: Nav;
  next: Nav;
  initialDone: boolean;
  initialHomework: HomeworkItem[];
}) {
  const [done, setDone] = useState(initialDone);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const nextDone = !done;
    setDone(nextDone);
    setSaving(true);
    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_slug: slug, done: nextDone }),
      });
    } catch {
      setDone(done);
    } finally {
      setSaving(false);
    }
  }

  // 从 markdown 源码提取 ## 二级标题作为目录
  const toc = useMemo(
    () =>
      content
        .split("\n")
        .filter((l) => l.startsWith("## "))
        .map((l) => ({
          text: l.replace(/^##\s+/, "").replace(/[#*`]/g, "").trim(),
          id: slugify(l.replace(/^##\s+/, "")),
        })),
    [content]
  );

  return (
    <div className="flex gap-8">
      {/* 正文 */}
      <article className="min-w-0 flex-1">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 md:px-10">
          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:mt-8 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:text-xl prose-h3:text-lg">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* 作业提交（AI 批改） */}
          <HomeworkWidget lessonSlug={slug} content={content} initialItems={initialHomework} />
        </div>

        {/* 底部操作 */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={toggle}
            disabled={saving}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              done
                ? "bg-green-500 text-white hover:bg-green-600"
                : "border border-slate-300 bg-white text-slate-600 hover:border-green-400 hover:text-green-600"
            }`}
          >
            {done ? "✓ 已学完（点击取消）" : "标记已学"}
          </button>
          <div className="text-xs text-slate-400">
            上/下一课：{prev ? prev.subject : "—"} → {next ? next.subject : "—"}
          </div>
        </div>

        {/* 上/下一课 */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/course/${encodeURIComponent(prev.slug)}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-xs text-slate-400">← 上一课</div>
              <div className="mt-0.5 truncate text-sm font-medium">{prev.title}</div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/course/${encodeURIComponent(next.slug)}`}
              className="rounded-xl border border-slate-200 bg-white p-4 text-right hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-xs text-slate-400">下一课 →</div>
              <div className="mt-0.5 truncate text-sm font-medium">{next.title}</div>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </article>

      {/* 侧边目录 */}
      {toc.length > 0 && (
        <aside className="sticky top-20 hidden h-fit w-56 shrink-0 xl:block">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              本课目录
            </div>
            <ul className="space-y-1 text-sm">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="block truncate rounded px-2 py-1 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                  >
                    {t.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
