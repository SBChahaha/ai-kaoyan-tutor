"use client";

import { useState } from "react";

// 错题批量操作：全选待复习 → 一键标记已复习 / 删除
export default function BatchOps({ ids, onDone }: { ids: number[]; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function run(action: "review" | "delete") {
    if (busy || ids.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          action === "review"
            ? fetch(`/api/mistakes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "reviewed" }),
              })
            : fetch(`/api/mistakes/${id}`, { method: "DELETE" })
        )
      );
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run("review")}
        disabled={busy || ids.length === 0}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
      >
        ✅ 标记已复习（{ids.length}）
      </button>
      <button
        onClick={() => run("delete")}
        disabled={busy || ids.length === 0}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40"
      >
        🗑️ 批量删除（{ids.length}）
      </button>
    </div>
  );
}
