import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }
  // status 白名单：只允许合法状态（防止 "deleted" 等脏数据）
  const ALLOWED = ["pending", "reviewed"];
  const fields: Record<string, string | number> = {};
  for (const k of [
    "subject",
    "chapter",
    "question",
    "my_answer",
    "right_answer",
    "wrong_reason",
    "ai_analysis",
    "status",
  ]) {
    if (body[k] === undefined) continue;
    if (k === "status" && !ALLOWED.includes(String(body[k]))) {
      return NextResponse.json({ error: "status 必须是 pending 或 reviewed" }, { status: 400 });
    }
    fields[k] = String(body[k]);
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  const sets = Object.keys(fields)
    .map((k) => `${k} = ?`)
    .join(", ");
  db.prepare(`UPDATE mistakes SET ${sets} WHERE id = ?`).run(...Object.values(fields), Number(id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM mistakes WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
