import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLesson } from "@/lib/course";
import { chat, SYSTEM_PROMPT, type ChatMsg } from "@/lib/llm";

export const runtime = "nodejs";

// 作业列表（?lesson=slug 过滤）
export async function GET(req: NextRequest) {
  const lesson = req.nextUrl.searchParams.get("lesson");
  const rows = lesson
    ? db
        .prepare("SELECT * FROM homework WHERE lesson_slug = ? ORDER BY question_index")
        .all(lesson)
    : db.prepare("SELECT * FROM homework ORDER BY created_at DESC").all();
  return NextResponse.json(rows);
}

// 提交作业并 AI 批改
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lesson_slug, question_index, answer } = body as {
      lesson_slug: string;
      question_index: number;
      answer: string;
    };
    if (!lesson_slug || !answer?.trim() || typeof question_index !== "number") {
      return NextResponse.json({ error: "lesson_slug、question_index、answer 必填" }, { status: 400 });
    }

    const lesson = getLesson(lesson_slug);
    if (!lesson) return NextResponse.json({ error: "课程不存在" }, { status: 404 });

    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `你是严格的考研数学批改老师。以下是课程《${lesson.meta.title}》（${lesson.meta.subject} · ${lesson.meta.chapter}）的完整讲义：\n\n${lesson.content.slice(0, 12000)}\n\n请找出讲义中"自查题"部分的第 ${question_index} 题，批改学生的作答。要求：\n1. 给出评分（满分 10 分，整数）\n2. 指出对/错、遗漏点和错误根源\n3. 给出正确思路（简洁）\n4. 输出格式：\n评分：X/10\n评语：...\n\n学生作答：\n"""${answer}"""`,
      },
    ];

    let feedback = "";
    let score: number | null = null;
    try {
      const raw = await chat(messages);
      feedback = raw;
      const m = raw.match(/评分[：:]\s*(\d+)\s*\/\s*10/);
      if (m) score = Math.min(10, Math.max(0, Number(m[1])));
    } catch (e) {
      feedback = `AI 批改失败：${e instanceof Error ? e.message : "未知错误"}`;
    }

    const now = new Date().toISOString();
    const r = db
      .prepare(
        `INSERT INTO homework (lesson_slug, question_index, answer, feedback, score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(lesson_slug, question_index, answer, feedback, score, now, now);

    return NextResponse.json({
      id: Number(r.lastInsertRowid),
      lesson_slug,
      question_index,
      score,
      feedback,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "未知错误" },
      { status: 500 }
    );
  }
}
