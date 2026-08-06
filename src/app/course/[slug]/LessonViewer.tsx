"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useRouter } from "next/navigation";

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
  initialFlagged,
}: {
  slug: string;
  content: string;
  prev: Nav;
  next: Nav;
  initialDone: boolean;
  initialFlagged: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [flagged, setFlagged] = useState(initialFlagged);
  const [saving, setSaving] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [dark, setDark] = useState(false);
  const router = useRouter();

  // 阅读偏好持久化
  useEffect(() => {
    const fs = Number(localStorage.getItem("lesson_font_scale") ?? 1);
    const dk = localStorage.getItem("lesson_dark") === "1";
    if (fs >= 0.85 && fs <= 1.3) setFontScale(fs);
    setDark(dk);
  }, []);

  useEffect(() => {
    localStorage.setItem("lesson_font_scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem("lesson_dark", dark ? "1" : "0");
  }, [dark]);

  // J/K 上一课/下一课
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "j" && next) {
        e.preventDefault();
        router.push(`/course/${encodeURIComponent(next.slug)}`);
      }
      if (e.key.toLowerCase() === "k" && prev) {
        e.preventDefault();
        router.push(`/course/${encodeURIComponent(prev.slug)}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 📍 scroll-spy：滚动时高亮当前阅读章节
  const [activeId, setActiveId] = useState<string | null>(null);

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

  async function toggleFlag() {
    const nextFlag = !flagged;
    setFlagged(nextFlag);
    try {
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_slug: slug, flagged: nextFlag }),
      });
    } catch {
      setFlagged(flagged);
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

  // 📍 scroll-spy：滚动时高亮当前阅读章节（toc 就绪后挂载）
  useEffect(() => {
    function onScroll() {
      let current: string | null = null;
      for (const t of toc) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= 110) current = t.id;
        else if (el) break;
      }
      setActiveId(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [toc]);

  // 📖 阅读进度条：随滚动填充顶部
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.round((h.scrollTop / total) * 100)) : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 📑 移动端目录：React state 控制（不依赖浏览器 details 行为）
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="flex gap-8">
      {/* 阅读进度条 */}
      <div className="no-print fixed left-0 top-0 z-50 h-0.5 w-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* 正文 */}
      <article className="min-w-0 flex-1">
        {/* 阅读工具栏：字号 + 夜间 + 快捷键提示 */}
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {toc.length > 0 && (
              <div className="relative xl:hidden">
                <button
                  onClick={() => setTocOpen((o) => !o)}
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  📑 目录 {tocOpen ? "▾" : "▸"}
                </button>
                {tocOpen && (
                  <div className="mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
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
                )}
              </div>
            )}
            <button
              onClick={() => setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              title="减小字号"
            >
              A−
            </button>
            <button
              onClick={() => setFontScale((s) => Math.min(1.3, +(s + 0.1).toFixed(2)))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              title="增大字号"
            >
              A+
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                dark
                  ? "border-indigo-300 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="夜间阅读（仅讲义区）"
            >
              🌙 夜间
            </button>
          </div>
          <span className="text-xs text-slate-400">
            快捷键：K 上一课 / J 下一课
          </span>
        </div>
        <div
          className={`rounded-2xl border px-6 py-8 transition-colors md:px-10 ${
            dark ? "lesson-dark border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
          }`}
          style={{ fontSize: `${fontScale}em` }}
        >
          <div
            className={`prose max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:mt-8 prose-h2:border-b prose-h2:pb-2 prose-h2:text-xl prose-h3:text-lg ${
              dark ? "lesson-dark prose-invert" : "prose-slate"
            }`}
          >
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
        </div>

        {/* 底部操作 */}
        <div className="no-print mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
            <button
              onClick={toggleFlag}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                flagged
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-slate-300 bg-white text-slate-600 hover:border-red-400 hover:text-red-600"
              }`}
              title="标记为难点，出现在课程页难点清单"
            >
              {flagged ? "📌 已标难点（点击取消）" : "📌 标记难点"}
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              title="打印讲义（自动隐藏导航和按钮）"
            >
              🖨️ 打印
            </button>
          </div>
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
                    className={`block truncate rounded px-2 py-1 ${
                      activeId === t.id
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    }`}
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
