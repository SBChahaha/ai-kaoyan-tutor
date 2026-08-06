import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const r = db
    .prepare("UPDATE notes SET title = ?, content_md = ?, updated_at = ? WHERE id = ?")
    .run(body.title ?? "", body.content_md ?? "", new Date().toISOString(), Number(id));
  if (r.changes === 0) return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM notes WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
