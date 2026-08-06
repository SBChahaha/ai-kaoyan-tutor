// 构建答疑上下文：学习状态 + 章节笔记 + 历史对话（chat 与 stream 路由共用）
import { db, getNote } from "@/lib/db";
import type { ChatMsg } from "@/lib/llm";

export function buildContextMessages(
  question: string,
  noteId?: number,
  history: ChatMsg[] = []
): ChatMsg[] {
  const messages: ChatMsg[] = [];

  // 学习状态上下文：当前进度 + 最近错题 + 难点
  try {
    const passed = (
      db
        .prepare("SELECT COUNT(DISTINCT lesson_slug) AS c FROM quiz_attempts WHERE passed = 1")
        .get() as { c: number }
    ).c;
    const pending = db
      .prepare(
        "SELECT question, right_answer, wrong_reason FROM mistakes WHERE status = 'pending' ORDER BY id DESC LIMIT 3"
      )
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

  // 章节笔记上下文
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

  // 历史对话（多轮记忆）：只保留最近的 user/assistant 对
  if (history.length > 0) {
    messages.push({
      role: "user",
      content: "以下是我们的历史对话，继续回答时请保持连贯：",
    });
    messages.push({ role: "assistant", content: "好的，我会结合之前的对话继续。" });
    messages.push(...history);
  }

  messages.push({ role: "user", content: question });
  return messages;
}
