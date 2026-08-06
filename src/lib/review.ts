// 错题复习模式：从待复习错题生成选择题测试
import { db, type Mistake } from "@/lib/db";

export type ReviewQuestion = {
  mistake_id: number;
  question: string;
  options: string[];
  answer: number; // 正确选项下标
  explanation: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildReviewQuestions(limit = 8): ReviewQuestion[] {
  const rows = db
    .prepare("SELECT * FROM mistakes WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?")
    .all(limit) as unknown as Mistake[];
  const out: ReviewQuestion[] = [];

  for (const m of rows) {
    // 优先使用原题选项（闯关自动入库的错题带 options）
    let usedOriginal = false;
    if (m.options) {
      try {
        const opts = JSON.parse(m.options) as string[];
        if (Array.isArray(opts) && opts.length >= 2) {
          const ai = opts.indexOf(m.right_answer);
          if (ai >= 0) {
            out.push({
              mistake_id: m.id,
              question: m.question,
              options: opts,
              answer: ai,
              explanation: m.ai_analysis || "复习此题，回顾正确思路。",
            });
            usedOriginal = true;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (usedOriginal) continue;

    // 降级：用同科目其他错题的答案合成干扰项
    const others = db
      .prepare(
        "SELECT right_answer FROM mistakes WHERE subject = ? AND right_answer != ? AND id != ? LIMIT 4"
      )
      .all(m.subject, m.right_answer, m.id) as unknown as { right_answer: string }[];
    const pool = shuffle(
      Array.from(
        new Set([m.right_answer, m.my_answer, ...others.map((o) => o.right_answer)].filter(Boolean))
      )
    );
    if (pool.length >= 2) {
      out.push({
        mistake_id: m.id,
        question: m.question,
        options: pool,
        answer: pool.indexOf(m.right_answer),
        explanation: m.ai_analysis || "复习此题，回顾正确思路。",
      });
    } else if (pool.length === 1) {
      out.push({
        mistake_id: m.id,
        question: m.question,
        options: [pool[0], "（其他选项）"],
        answer: 0,
        explanation: m.ai_analysis || "",
      });
    }
  }
  return out;
}
