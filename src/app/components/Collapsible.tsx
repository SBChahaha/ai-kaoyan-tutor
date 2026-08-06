"use client";

import { useEffect, useState } from "react";

// 📋 可折叠卡片：标题栏 + 展开内容，折叠状态记忆
export default function Collapsible({
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`card_${id}`);
      if (saved !== null) setOpen(saved === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(`card_${id}`, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, ready, id]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-xs text-slate-400">{open ? "▾ 收起" : "▸ 展开"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
