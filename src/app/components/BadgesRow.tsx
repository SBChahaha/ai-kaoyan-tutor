"use client";

import { useEffect, useState } from "react";

type Badge = { id: string; name: string; icon: string; desc: string; earned: boolean };

export default function BadgesRow() {
  const [badges, setBadges] = useState<Badge[] | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setBadges(d.badges ?? []));
  }, []);

  if (!badges) return null;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">🏆 成就</h2>
        <span className="text-sm text-slate-500">
          {earnedCount}/{badges.length} 已达成
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {badges.map((b) => (
          <div
            key={b.id}
            title={`${b.name}：${b.desc}`}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center transition ${
              b.earned ? "bg-amber-50" : "opacity-35 grayscale"
            }`}
          >
            <span className="text-2xl">{b.icon}</span>
            <span className="text-[10px] font-medium text-slate-600">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
