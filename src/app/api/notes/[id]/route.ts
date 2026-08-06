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
  // 未传的字段保留原值（防止清空已有内容）
  const updates: string[] = [];
  const values: (string | number)[] = [];
  if (body.title !== undefined) {
    updates.push("title = ?");
    values.push(String(body.title));
  }
  if (body.content_md !== undefined) {
    updates.push("content_md = ?");
    values.push(String(body.content_md));
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }
  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  const r = db
    .prepare(`UPDATE notes SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values, Number(id));
  if (r.changes === 0) return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM notes WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
