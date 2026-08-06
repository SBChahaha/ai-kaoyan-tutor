import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

// 用户设置（每日目标等）
export async function GET() {
  return NextResponse.json({
    daily_target: Number(getSetting("daily_target", "8")),
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.daily_target !== undefined) {
    const v = Number(body.daily_target);
    if (isNaN(v) || v <= 0 || v > 24) {
      return NextResponse.json({ error: "daily_target 需为 1-24 的数字" }, { status: 400 });
    }
    setSetting("daily_target", String(v));
  }
  return NextResponse.json({ ok: true, daily_target: Number(getSetting("daily_target", "8")) });
}
