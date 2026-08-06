import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const rows = date
    ? db.prepare("SELECT * FROM plans WHERE date = ? ORDER BY id").all(date)
    : db.prepare("SELECT * FROM plans ORDER BY date DESC, id").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, subject, task } = body as Record<string, string>;
  if (!date || !task) return NextResponse.json({ error: "date 和 task 必填" }, { status: 400 });
  const r = db
    .prepare("INSERT INTO plans (date, subject, task, done) VALUES (?, ?, ?, 0)")
    .run(date, subject || "通用", task);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
