import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 课程完成进度（服务器端存储，AI 可查）
export async function GET() {
  const rows = db.prepare("SELECT lesson_slug, done, updated_at FROM progress").all();
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { lesson_slug, done } = body as { lesson_slug: string; done: boolean };
  if (!lesson_slug || typeof done !== "boolean") {
    return NextResponse.json({ error: "lesson_slug 和 done 必填" }, { status: 400 });
  }
  db.prepare(
    `INSERT INTO progress (lesson_slug, done, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(lesson_slug) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`
  ).run(lesson_slug, done ? 1 : 0, new Date().toISOString());
  return NextResponse.json({ ok: true, lesson_slug, done });
}
