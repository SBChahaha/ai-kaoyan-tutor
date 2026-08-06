import Link from "next/link";
import { db } from "@/lib/db";
import { SUBJECTS } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  // 每个章节取最早创建的笔记（种子生成的章节壳）
  const rows = db
    .prepare("SELECT * FROM notes ORDER BY subject, id")
    .all() as unknown as { id: number; subject: string; chapter: string; title: string }[];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">📚 知识库</h1>
      <p className="mb-5 text-sm text-slate-500">
        按 408 考纲 + 公共课章节组织，点击章节进入笔记编辑
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {SUBJECTS.map((s) => {
          const notes = rows.filter((n) => n.subject === s.name);
          return (
            <div key={s.name} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-blue-700">{s.name}</h2>
              <ul className="space-y-1">
                {s.chapters.map((ch) => {
                  const note = notes.find((n) => n.chapter === ch);
                  return (
                    <li key={ch}>
                      {note ? (
                        <Link
                          href={`/notes/${note.id}`}
                          className="flex items-center justify-between rounded px-2 py-1 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <span>{ch}</span>
                          <span className="text-xs text-slate-400">编辑 →</span>
                        </Link>
                      ) : (
                        <span className="block px-2 py-1 text-sm text-slate-400">{ch}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
