import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM logs ORDER BY date DESC, id DESC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, hours, content, plan_tomorrow } = body as Record<string, string>;
  if (!date) return NextResponse.json({ error: "date 必填" }, { status: 400 });
  const r = db
    .prepare(
      "INSERT INTO logs (date, hours, content, plan_tomorrow, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(date, Number(hours) || 0, content || "", plan_tomorrow || "", new Date().toISOString());
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
