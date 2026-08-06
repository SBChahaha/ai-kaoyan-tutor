import { NextRequest, NextResponse } from "next/server";
import { chat, SYSTEM_PROMPT, type ChatMsg } from "@/lib/llm";
import { getNote, db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, noteId, mistake } = body as {
      question: string;
      noteId?: number;
      mistake?: {
        subject: string;
        chapter: string;
        question: string;
        my_answer: string;
        right_answer: string;
        wrong_reason: string;
      };
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
    }

    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // 携带学习状态上下文：当前进度 + 最近错题 + 难点（让 AI 更懂用户）
    try {
      const passed = (
        db
          .prepare("SELECT COUNT(DISTINCT lesson_slug) AS c FROM quiz_attempts WHERE passed = 1")
          .get() as { c: number }
      ).c;
      const pending = db
        .prepare("SELECT question, right_answer, wrong_reason FROM mistakes WHERE status = 'pending' ORDER BY id DESC LIMIT 3")
        .all() as unknown as { question: string; right_answer: string; wrong_reason: string }[];
      const flagged = db
        .prepare("SELECT lesson_slug FROM progress WHERE flagged = 1")
        .all() as unknown as { lesson_slug: string }[];
      const ctxLines = [
        `【用户学习状态】已通关 ${passed} 个关卡`,
        flagged.length ? `【标记的难点章节】${flagged.map((f) => f.lesson_slug).join("、")}` : "",
        pending.length
          ? `【最近待复习错题】${pending
              .map((p) => `《${p.question.slice(0, 40)}》错因:${p.wrong_reason}`)
              .join("；")}`
          : "",
      ].filter(Boolean);
      if (ctxLines.length > 0) {
        messages.push({
          role: "user",
          content: `${ctxLines.join("\n")}\n\n（以上是用户学习状态上下文，回答时默认用户只掌握了已通关关卡的内容，遇到相关概念要解释清楚）`,
        });
        messages.push({ role: "assistant", content: "好的，我已了解你的学习状态，请提问。" });
      }
    } catch {
      /* 上下文增强失败不影响答疑 */
    }

    // 携带当前章节笔记作为上下文
    if (noteId) {
      const note = getNote(Number(noteId));
      if (note) {
        messages.push({
          role: "user",
          content: `【当前学习章节】${note.subject} - ${note.chapter}\n【我的笔记】\n${note.content_md.slice(0, 6000)}\n\n（以上是上下文，用户接下来会提问，请结合上下文回答）`,
        });
        messages.push({ role: "assistant", content: "好的，我已了解当前章节内容，请提问。" });
      }
    }

    // 错题解析模式
    if (mistake) {
      messages.push({
        role: "user",
        content: `【错题解析请求】\n科目：${mistake.subject}\n章节：${mistake.chapter || "未知"}\n题目：${mistake.question}\n我的答案：${mistake.my_answer || "未填"}\n正确答案：${mistake.right_answer || "未填"}\n我的错误原因分析：${mistake.wrong_reason || "未填"}\n\n请帮我：1) 给出本题完整解析 2) 分析我错误思路的根源 3) 总结这类题目的解题套路 4) 指出相关高频考点。`,
      });
    } else {
      messages.push({ role: "user", content: question });
    }

    const answer = await chat(messages);
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
