import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 课程完成进度 + 难点标记（服务器端存储，AI 可查）
export async function GET() {
  const rows = db
    .prepare("SELECT lesson_slug, done, flagged, updated_at FROM progress")
    .all();
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { lesson_slug, done, flagged } = body as {
    lesson_slug: string;
    done?: boolean;
    flagged?: boolean;
  };
  if (!lesson_slug || (done === undefined && flagged === undefined)) {
    return NextResponse.json({ error: "lesson_slug 与 done/flagged 必填" }, { status: 400 });
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO progress (lesson_slug, done, flagged, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(lesson_slug) DO UPDATE SET
       done = COALESCE(?, done),
       flagged = COALESCE(?, flagged),
       updated_at = excluded.updated_at`
  ).run(
    lesson_slug,
    done === undefined ? 0 : done ? 1 : 0,
    flagged === undefined ? 0 : flagged ? 1 : 0,
    now,
    done === undefined ? null : done ? 1 : 0,
    flagged === undefined ? null : flagged ? 1 : 0
  );
  return NextResponse.json({ ok: true, lesson_slug, done, flagged });
}
