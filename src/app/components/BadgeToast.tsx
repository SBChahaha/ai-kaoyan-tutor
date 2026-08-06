"use client";

import { useEffect, useState } from "react";

type Badge = { id: string; name: string; icon: string; desc: string; earned: boolean };

// 🔔 成就解锁通知：新徽章弹 toast 庆祝（localStorage 记录已见）
export default function BadgeToast() {
  const [toast, setToast] = useState<Badge | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        const badges = (d.badges ?? []) as Badge[];
        const earned = badges.filter((b) => b.earned);
        if (earned.length === 0) return;
        let seen: string[] = [];
        try {
          seen = JSON.parse(localStorage.getItem("seen_badges") ?? "[]");
        } catch {
          /* ignore */
        }
        const fresh = earned.filter((b) => !seen.includes(b.id));
        if (fresh.length === 0) return;
        localStorage.setItem(
          "seen_badges",
          JSON.stringify(Array.from(new Set([...seen, ...fresh.map((b) => b.id)])))
        );
        // 逐个弹出
        fresh.forEach((b, i) => {
          setTimeout(() => setToast(b), i * 3200);
          setTimeout(() => setToast(null), i * 3200 + 2800);
        });
      });
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-2xl">
        <span className="text-4xl">{toast.icon}</span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">
            🏆 成就解锁
          </div>
          <div className="font-bold text-slate-800">{toast.name}</div>
          <div className="text-xs text-slate-500">{toast.desc}</div>
        </div>
      </div>
    </div>
  );
}
