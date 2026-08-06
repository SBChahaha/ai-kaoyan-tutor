import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 全量数据备份（JSON）
const TABLES = [
  "notes",
  "mistakes",
  "logs",
  "plans",
  "progress",
  "homework",
  "quiz_attempts",
  "daily_review",
  "settings",
];

export async function GET() {
  const backup: Record<string, unknown> = {
    app: "ai-kaoyan-tutor",
    exported_at: new Date().toISOString(),
  };
  for (const t of TABLES) {
    try {
      backup[t] = db.prepare(`SELECT * FROM ${t}`).all();
    } catch {
      backup[t] = [];
    }
  }
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaoyan-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

// POST：从备份 JSON 恢复（白名单表 + 事务，先清空后导入）
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "备份文件格式错误（需要 JSON）" }, { status: 400 });
  }
  if (payload.app !== "ai-kaoyan-tutor") {
    return NextResponse.json({ error: "不是本平台的备份文件" }, { status: 400 });
  }

  const stats: Record<string, number> = {};
  db.exec("BEGIN");
  try {
    for (const t of TABLES) {
      const rows = payload[t];
      if (!Array.isArray(rows)) continue;
      // 取表真实列（按名映射，忽略备份里不存在的列）
      const cols = (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(
        (c) => c.name
      );
      db.prepare(`DELETE FROM ${t}`).run();
      let n = 0;
      for (const row of rows as Record<string, unknown>[]) {
        const kv = cols.filter((c) => c in row).map((c) => [c, row[c]] as const);
        if (kv.length === 0) continue;
        const names = kv.map(([c]) => c).join(",");
        const placeholders = kv.map(() => "?").join(",");
        db.prepare(`INSERT INTO ${t} (${names}) VALUES (${placeholders})`).run(
          ...kv.map(([, v]) => (v === null || v === undefined ? null : String(v)))
        );
        n++;
      }
      stats[t] = n;
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    return NextResponse.json(
      { error: `恢复失败（已回滚）：${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, restored: stats });
}
