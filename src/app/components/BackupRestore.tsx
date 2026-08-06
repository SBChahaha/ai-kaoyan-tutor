"use client";

import { useRef, useState } from "react";

// 💾 备份恢复：选择备份 JSON 上传导入
export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const text = await file.text();
      const r = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const d = await r.json();
      if (d.ok) {
        const parts = Object.entries(d.restored as Record<string, number>)
          .map(([t, n]) => `${t}:${n}`)
          .join(" ");
        setMsg({ ok: true, text: `✅ 恢复成功！${parts}` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMsg({ ok: false, text: `❌ ${d.error ?? "恢复失败"}` });
      }
    } catch {
      setMsg({ ok: false, text: "❌ 读取文件失败" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={onFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="hover:text-blue-600 disabled:opacity-50"
        title="从备份 JSON 恢复全部数据（先清空现有数据）"
      >
        {busy ? "恢复中…" : "🔄 恢复备份"}
      </button>
      {msg && (
        <span className={msg.ok ? "text-green-600" : "text-red-500"}>{msg.text}</span>
      )}
    </div>
  );
}
