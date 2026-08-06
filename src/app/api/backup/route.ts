import { NextResponse } from "next/server";
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
