// 闯关模式核心逻辑：关卡加载、判分、星级、解锁
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

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
  questions: QuizQuestion[];
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
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Quiz;
  } catch {
    return null;
  }
}

export function hasQuiz(slug: string): boolean {
  return getQuiz(slug) !== null;
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

// 闯关状态：按课程顺序线性解锁（有关卡的课才参与）
export type LevelState = {
  slug: string;
  title: string;
  subject: string;
  hasQuiz: boolean;
  unlocked: boolean;
  passed: boolean;
  stars: number;
  attempts: number;
};

export function getLevelStates(
  lessons: { slug: string; title: string; subject: string }[]
): LevelState[] {
  const attempts = db
    .prepare("SELECT lesson_slug, stars, passed FROM quiz_attempts ORDER BY id")
    .all() as unknown as { lesson_slug: string; stars: number; passed: number }[];

  // 每关取最近一次尝试
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
  for (const l of lessons) {
    const hq = hasQuiz(l.slug);
    const b = best.get(l.slug);
    const passed = !!b?.passed;
    const unlocked = hq ? prevPassed : true;
    states.push({
      slug: l.slug,
      title: l.title,
      subject: l.subject,
      hasQuiz: hq,
      unlocked,
      passed,
      stars: b?.stars ?? 0,
      attempts: b?.count ?? 0,
    });
    if (hq) prevPassed = passed;
  }
  return states;
}

export function getAttempts(slug: string): QuizAttempt[] {
  return db
    .prepare("SELECT * FROM quiz_attempts WHERE lesson_slug = ? ORDER BY id DESC")
    .all(slug) as unknown as QuizAttempt[];
}
