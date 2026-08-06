import { NextResponse } from "next/server";
import { listLessons } from "@/lib/course";

// 课程清单（机器可读）
export async function GET() {
  const lessons = listLessons().map((l) => ({
    slug: l.slug,
    title: l.title,
    subject: l.subject,
    chapter: l.chapter,
    order: l.order,
    url: `/course/${encodeURIComponent(l.slug)}`,
  }));
  return NextResponse.json({ total: lessons.length, lessons });
}
