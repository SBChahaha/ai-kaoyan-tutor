import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject") || undefined;
  const rows = subject
    ? db
        .prepare("SELECT * FROM mistakes WHERE subject = ? ORDER BY created_at DESC")
        .all(subject)
    : db.prepare("SELECT * FROM mistakes ORDER BY created_at DESC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subject, chapter, question, my_answer, right_answer, wrong_reason, ai_analysis } =
    body as Record<string, string>;
  if (!subject || !question) {
    return NextResponse.json({ error: "subject 和 question 必填" }, { status: 400 });
  }
  // 去重：相同题目（含科目）已存在则不重复录入
  const dup = db
    .prepare("SELECT id FROM mistakes WHERE subject = ? AND question = ?")
    .get(subject, question);
  if (dup) {
    return NextResponse.json(
      { error: "这道题已经在错题本里了", id: (dup as { id: number }).id },
      { status: 409 }
    );
  }
  const r = db
    .prepare(
      `INSERT INTO mistakes (subject, chapter, question, my_answer, right_answer, wrong_reason, ai_analysis, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      subject,
      chapter || "",
      question,
      my_answer || "",
      right_answer || "",
      wrong_reason || "",
      ai_analysis || "",
      new Date().toISOString()
    );
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
