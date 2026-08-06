"use client";

import { useEffect, useState } from "react";

// ⌨️ 快捷键帮助面板：按 ? 弹出全站快捷键总览
const SHORTCUTS = [
  { keys: "A / B / C / D", desc: "闯关：直接选答案（选择题）" },
  { keys: "1 / 2 / 3 / 4", desc: "闯关：选答案（数字键）" },
  { keys: "Enter", desc: "闯关：下一题 / 提交判分" },
  { keys: "← / →", desc: "闯关：上一题 / 下一题" },
  { keys: "K / J", desc: "讲义：上一课 / 下一课" },
  { keys: "?", desc: "任意页面：打开本帮助面板" },
];

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        // 避免在输入框内触发
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">⌨️ 快捷键</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50"
          >
            Esc 关闭
          </button>
        </div>
        <ul className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <kbd className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                {s.keys}
              </kbd>
              <span className="text-right text-slate-600">{s.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-400">
          💡 输入框内快捷键不生效，避免打字冲突
        </p>
      </div>
    </div>
  );
}
