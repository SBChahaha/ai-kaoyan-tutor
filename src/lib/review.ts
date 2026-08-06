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

// 种子化洗牌：同一 seed 生成同一顺序（GET 与 POST 判分一致）
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 艾宾浩斯复习间隔（按复习次数递增）：首次错 1 天后 → 3 天 → 7 天 → 15 天 → 30 天
export function reviewInterval(reviewCount: number): number {
  const intervals = [1, 3, 7, 15, 30];
  return intervals[Math.min(reviewCount, intervals.length - 1)];
}

// 到期时间（下次应复习的时间戳）
export function nextDueAt(m: {
  review_count?: number;
  last_reviewed_at?: string | null;
  created_at: string;
}): number {
  const base = m.last_reviewed_at ? new Date(m.last_reviewed_at).getTime() : new Date(m.created_at).getTime();
  return base + reviewInterval(m.review_count ?? 0) * 86400000;
}

export function buildReviewQuestions(limit = 8, seed = 0): ReviewQuestion[] {
  // 待复习 + 已到期的已复习错题（艾宾浩斯到期重激活）
  const rows = db.prepare("SELECT * FROM mistakes LIMIT 500").all() as unknown as Mistake[];
  const now = Date.now();
  const due = rows.filter(
    (m) => m.status === "pending" || (m.status === "reviewed" && nextDueAt(m) <= now)
  );
  // 到期优先：已到复习时间的排前（最久未复习的在前），其余按错题时间
  due.sort((a, b) => {
    const aDue = nextDueAt(a) <= now ? 0 : 1;
    const bDue = nextDueAt(b) <= now ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return nextDueAt(a) - nextDueAt(b);
  });
  const picked = due.slice(0, limit);
  const out: ReviewQuestion[] = [];
  let pickSeed = seed >>> 0;

  for (const m of picked) {
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

    // 降级：用同科目其他错题的答案合成干扰项（种子化，保证 GET/POST 一致）
    const others = db
      .prepare(
        "SELECT right_answer FROM mistakes WHERE subject = ? AND right_answer != ? AND id != ? LIMIT 4"
      )
      .all(m.subject, m.right_answer, m.id) as unknown as { right_answer: string }[];
    const pool = seededShuffle(
      Array.from(
        new Set([m.right_answer, m.my_answer, ...others.map((o) => o.right_answer)].filter(Boolean))
      ),
      pickSeed + m.id
    );
    pickSeed = (pickSeed + 1) >>> 0;
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
