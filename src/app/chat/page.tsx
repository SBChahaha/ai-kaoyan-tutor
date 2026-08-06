"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string };
type Note = { id: number; subject: string; chapter: string };

export default function ChatPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteId, setNoteId] = useState<number | 0>(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((rows: Note[]) => setNotes(rows));
    // 从 URL 参数带过来章节（知识库页面跳转）或问题（首页快速提问）
    const m = window.location.search.match(/note=(\d+)/);
    if (m) setNoteId(Number(m[1]));
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setInput(q);
      setTimeout(() => doAsk(q), 100);
    }
  }, []);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    await doAsk(q);
  }

  async function doAsk(text: string) {
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, noteId: noteId || undefined }),
      });
      const data = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? data.error ?? "出错了" }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ 网络错误，请重试" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-140px)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">🤖 AI 答疑</h1>
        <select
          value={noteId}
          onChange={(e) => setNoteId(Number(e.target.value))}
          className="max-w-[300px] rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value={0}>不带章节上下文</option>
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.subject} · {n.chapter}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <div className="pt-10 text-center text-sm text-slate-400">
            <p className="mb-2 text-3xl">🦉</p>
            <p>我是 AI 考研助教，面向 11408 备考</p>
            <p className="mt-1">可以问：概念讲解 / 真题解析 / 错题分析 / 复习规划</p>
            <p className="mt-3 text-xs">提示：选好"章节上下文"后提问，回答会结合你的笔记</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm"
              }
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
              思考中…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="输入问题，Enter 发送"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
