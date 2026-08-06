import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject") || undefined;
  const rows = subject
    ? db.prepare("SELECT * FROM notes WHERE subject = ? ORDER BY id").all(subject)
    : db.prepare("SELECT * FROM notes ORDER BY subject, id").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subject, chapter, title, content_md } = body as {
    subject: string;
    chapter: string;
    title: string;
    content_md: string;
  };
  if (!subject || !chapter) {
    return NextResponse.json({ error: "subject 和 chapter 必填" }, { status: 400 });
  }
  const r = db
    .prepare(
      "INSERT INTO notes (subject, chapter, title, content_md, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(subject, chapter, title || chapter, content_md || "", new Date().toISOString());
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
