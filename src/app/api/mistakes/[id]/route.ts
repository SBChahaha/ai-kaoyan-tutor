import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
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
    if (body[k] !== undefined) fields[k] = body[k];
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
