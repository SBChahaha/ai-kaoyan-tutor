import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  if (typeof body.done === "boolean") {
    db.prepare("UPDATE plans SET done = ? WHERE id = ?").run(body.done ? 1 : 0, Number(id));
  }
  if (body.task) {
    db.prepare("UPDATE plans SET task = ?, subject = ? WHERE id = ?").run(
      body.task,
      body.subject ?? "通用",
      Number(id)
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM plans WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
