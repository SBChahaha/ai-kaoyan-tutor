// 闯关模式核心逻辑：关卡加载、判分、星级、解锁
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { SUBJECTS } from "@/lib/config";

const QUIZ_ROOT = path.join(process.cwd(), "content", "quizzes");

export type QuizQuestion =
  | {
      type: "choice";
      question: string;
      options: string[];
      answer: number;
      explanation: string;
    }
  | {
      type: "fill";
      question: string;
      answer: string[];
      explanation: string;
    };

export type Quiz = {
  lesson: string;
  pass_percent: number;
  variants: QuizQuestion[][];
};

export type QuizAttempt = {
  id: number;
  lesson_slug: string;
  score: number;
  total: number;
  percent: number;
  stars: number;
  passed: number;
  answers: string;
  created_at: string;
};

export function getQuiz(slug: string): Quiz | null {
  const file = path.join(QUIZ_ROOT, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
    const variants = Array.isArray(data.variants)
      ? (data.variants as { questions: QuizQuestion[] }[]).map((v) => v.questions)
      : Array.isArray(data.questions)
        ? [(data.questions as unknown) as QuizQuestion[]]
        : [];
    if (variants.length === 0) return null;
    return {
      lesson: String(data.lesson ?? slug),
      pass_percent: Number(data.pass_percent ?? 70),
      variants,
    };
  } catch {
    return null;
  }
}

// 种子随机数（mulberry32）——同一 seed 得到同一变式，保证提交时判分一致
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickVariant(
  quiz: Quiz,
  seed: number
): { questions: QuizQuestion[]; variantIndex: number } {
  const idx = Math.floor(mulberry32(seed)() * quiz.variants.length);
  return { questions: quiz.variants[idx], variantIndex: idx };
}

export function hasQuiz(slug: string): boolean {
  return getQuiz(slug) !== null;
}

// BOSS 综合关：quiz JSON 带 boss 字段（值=章节名），挂在章节末尾
export type BossQuiz = {
  slug: string;
  title: string;
  chapter: string;
  pass_percent: number;
  variantCount: number;
};

export function getBossQuizzes(): BossQuiz[] {
  if (!fs.existsSync(QUIZ_ROOT)) return [];
  const out: BossQuiz[] = [];
  for (const f of fs.readdirSync(QUIZ_ROOT)) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(QUIZ_ROOT, f), "utf-8"));
      if (data?.boss) {
        out.push({
          slug: path.basename(f, ".json"),
          title: String(data.title ?? "综合关"),
          chapter: String(data.boss),
          pass_percent: Number(data.pass_percent ?? 70),
          variantCount: Array.isArray(data.variants) ? data.variants.length : 1,
        });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

// 判分：choice 比对选项下标；fill 做文本归一化 + 数值容差
function normText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s，,。;；、]+/g, "")
    .replace(/[（(]/g, "(")
    .replace(/[）)]/g, ")")
    .replace(/[＋+]/g, "+")
    .replace(/[－−-]/g, "-")
    .replace(/[×x*]/g, "*")
    .replace(/[÷/]/g, "/")
    .replace(/∞/g, "inf");
}

function isNumeric(s: string): boolean {
  return s.trim() !== "" && !isNaN(Number(s.trim()));
}

function checkFill(given: string, accepted: string[]): boolean {
  const g = normText(given);
  if (accepted.some((a) => normText(a) === g)) return true;
  // 数值容差
  if (isNumeric(given) && accepted.some((a) => isNumeric(a))) {
    const ga = Number(given.trim());
    const aa = Number(accepted.find(isNumeric)!.trim());
    if (Math.abs(ga - aa) <= 1e-6) return true;
  }
  return false;
}

export function checkAnswer(q: QuizQuestion, given: string | number | null): boolean {
  if (given === null || given === undefined || given === "") return false;
  if (q.type === "choice") return Number(given) === q.answer;
  return checkFill(String(given), q.answer);
}

// 星级：3星=满分，2星≥85%，1星=通过线，0星=未通过
export function calcStars(percent: number, passPercent: number): number {
  if (percent >= 100) return 3;
  if (percent >= 85) return 2;
  if (percent >= passPercent) return 1;
  return 0;
}

// 闯关状态：按课程顺序线性解锁（有关卡的课才参与）；章节末追加 BOSS 综合关
export type LevelState = {
  slug: string;
  title: string;
  subject: string;
  hasQuiz: boolean;
  unlocked: boolean;
  passed: boolean;
  stars: number;
  attempts: number;
  isBoss?: boolean;
  chapter?: string;
};

export function getLevelStates(
  lessons: { slug: string; title: string; subject: string; chapter?: string }[]
): LevelState[] {
  const attempts = db
    .prepare("SELECT lesson_slug, stars, passed FROM quiz_attempts ORDER BY id")
    .all() as unknown as { lesson_slug: string; stars: number; passed: number }[];

  // 每关取最佳尝试
  const best = new Map<string, { stars: number; passed: boolean; count: number }>();
  for (const a of attempts) {
    const cur = best.get(a.lesson_slug) ?? { stars: 0, passed: false, count: 0 };
    cur.count++;
    if (a.stars > cur.stars) cur.stars = a.stars;
    if (a.passed) cur.passed = true;
    best.set(a.lesson_slug, cur);
  }

  const states: LevelState[] = [];
  let prevPassed = true; // 第一关默认解锁

  // 按科目-章节分组（保持 config 顺序）
  const chapterKey = (s: string, c: string) => `${s}/${c}`;
  const byChapter = new Map<string, { lessons: typeof lessons; subject: string }>();
  for (const l of lessons) {
    const key = chapterKey(l.subject, l.chapter ?? "");
    const g = byChapter.get(key) ?? { lessons: [], subject: l.subject };
    g.lessons.push(l);
    byChapter.set(key, g);
  }
  // 章节顺序：SUBJECTS 配置顺序
  const orderedChapters: string[] = [];
  const bosses = getBossQuizzes();
  for (const s of SUBJECTS) {
    for (const ch of s.chapters) {
      const key = chapterKey(s.name, ch);
      if (byChapter.has(key)) orderedChapters.push(key);
    }
  }

  for (const key of orderedChapters) {
    const g = byChapter.get(key)!;
    const chapterStates: LevelState[] = [];
    for (const l of g.lessons) {
      const hq = hasQuiz(l.slug);
      const b = best.get(l.slug);
      const passed = !!b?.passed;
      const unlocked = hq ? prevPassed : true;
      chapterStates.push({
        slug: l.slug,
        title: l.title,
        subject: l.subject,
        hasQuiz: hq,
        unlocked,
        passed,
        stars: b?.stars ?? 0,
        attempts: b?.count ?? 0,
        chapter: g.subject,
      });
      if (hq) prevPassed = passed;
    }
    states.push(...chapterStates);

    // BOSS 关：本章全部关卡通过才解锁
    const boss = bosses.find((bq) => bq.chapter === g.subject);
    if (boss) {
      const allPassed = chapterStates.filter((s) => s.hasQuiz).every((s) => s.passed);
      const b = best.get(boss.slug);
      states.push({
        slug: boss.slug,
        title: boss.title,
        subject: g.subject,
        hasQuiz: true,
        unlocked: allPassed && prevPassed,
        passed: !!b?.passed,
        stars: b?.stars ?? 0,
        attempts: b?.count ?? 0,
        isBoss: true,
        chapter: g.subject,
      });
      if (b?.passed) prevPassed = true;
    }
  }
  return states;
}

export function getAttempts(slug: string): QuizAttempt[] {
  return db
    .prepare("SELECT * FROM quiz_attempts WHERE lesson_slug = ? ORDER BY id DESC")
    .all(slug) as unknown as QuizAttempt[];
}
