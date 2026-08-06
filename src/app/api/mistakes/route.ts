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
