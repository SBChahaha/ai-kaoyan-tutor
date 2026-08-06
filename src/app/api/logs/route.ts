import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM logs ORDER BY date DESC, id DESC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误（需要 JSON）" }, { status: 400 });
  }
  const { date, hours, content, plan_tomorrow } = body as Record<string, string>;
  if (!date) return NextResponse.json({ error: "date 必填" }, { status: 400 });
  // 时长范围校验：0~24 小时（负数/超大值会污染统计）
  const h = Number(hours);
  const safeHours = Number.isFinite(h) ? Math.min(24, Math.max(0, h)) : 0;
  const r = db
    .prepare(
      "INSERT INTO logs (date, hours, content, plan_tomorrow, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(date, safeHours, content || "", plan_tomorrow || "", new Date().toISOString());
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
