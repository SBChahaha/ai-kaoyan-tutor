"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Note = {
  id: number;
  subject: string;
  chapter: string;
  title: string;
  content_md: string;
  updated_at: string;
};

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/notes/${id}`).catch(() => null);
    fetch("/api/notes")
      .then((r) => r.json())
      .then((rows: Note[]) => setNote(rows.find((n) => n.id === Number(id)) ?? null));
  }, [id]);

  // 页面加载后同步内容
  useEffect(() => {
    if (note) setContent(note.content_md);
  }, [note]);

  const wordCount = useMemo(() => content.replace(/\s/g, "").length, [content]);

  async function save() {
    setSaving(true);
    await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: note?.title ?? "", content_md: content }),
    });
    setSaving(false);
    setMsg(`已保存 ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setMsg(""), 2000);
  }

  async function aiExplain() {
    setAiBusy(true);
    setAiResult("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "请根据我的笔记内容，帮我梳理这一章的核心考点、易错点和复习建议。",
          noteId: Number(id),
        }),
      });
      const data = await r.json();
      setAiResult(data.answer ?? data.error ?? "出错了");
    } finally {
      setAiBusy(false);
    }
  }

  if (!note) return <div className="p-8 text-center text-slate-400">加载中…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/notes" className="text-sm text-slate-500 hover:text-blue-600">
            ← 知识库
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            {note.subject} · {note.chapter}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">{wordCount} 字</span>
          <button
            onClick={() => setPreview(!preview)}
            className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          >
            {preview ? "编辑" : "预览"}
          </button>
          <button
            onClick={aiExplain}
            disabled={aiBusy}
            className="rounded bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {aiBusy ? "AI 讲解中…" : "✨ AI 梳理本章"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          {msg && <span className="text-green-600">{msg}</span>}
        </div>
      </div>

      {preview ? (
        <div className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-6 prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed outline-none focus:border-blue-400"
          placeholder="记录 AI 讲解内容、你的理解和考点…"
        />
      )}

      {aiResult && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-violet-800">✨ AI 梳理结果</h2>
            <button
              onClick={() => {
                setContent((c) => c + `\n\n---\n## AI 梳理（${new Date().toLocaleDateString()}）\n` + aiResult);
                setAiResult("");
                setMsg("已追加到笔记");
                setTimeout(() => setMsg(""), 2000);
              }}
              className="rounded bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-700"
            >
              追加到笔记
            </button>
          </div>
          <div className="prose prose-sm prose-slate max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
