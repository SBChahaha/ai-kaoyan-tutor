import { NextRequest, NextResponse } from "next/server";
import { chat, SYSTEM_PROMPT, type ChatMsg } from "@/lib/llm";
import { getNote } from "@/lib/db";

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
