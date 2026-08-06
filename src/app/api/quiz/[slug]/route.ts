import { NextRequest, NextResponse } from "next/server";
import {
  getQuiz,
  pickVariant,
  checkAnswer,
  calcStars,
  getAttempts,
  getNextLevel,
  type QuizQuestion,
} from "@/lib/quiz";
import { db } from "@/lib/db";
import { getLesson } from "@/lib/course";
import { chat, type ChatMsg } from "@/lib/llm";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

// GET：随机变式的题目（不含答案）+ 历史尝试
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const lessonSlug = decodeURIComponent(slug);
  const quiz = getQuiz(lessonSlug);
  if (!quiz) return NextResponse.json({ error: "该课程没有关卡" }, { status: 404 });

  const seed = Math.floor(Math.random() * 1e9);
  const { questions, variantIndex } = pickVariant(quiz, seed);

  const clean = questions.map((q) =>
    q.type === "choice"
      ? { type: q.type, question: q.question, options: q.options }
      : { type: q.type, question: q.question }
  );

  const attempts = getAttempts(lessonSlug).map((a) => ({
    id: a.id,
    score: a.score,
    total: a.total,
    percent: a.percent,
    stars: a.stars,
    passed: !!a.passed,
    created_at: a.created_at,
  }));

  return NextResponse.json({
    lesson: quiz.lesson,
    title: quiz.title ?? "关卡挑战",
    pass_percent: quiz.pass_percent,
    variant_index: variantIndex,
    variant_count: quiz.variants.length,
    seed,
    total: questions.length,
    questions: clean,
    attempts,
  });
}

// AI 审查选择题解释：判断是否真正理解（非蒙对）
async function gradeExplanations(
  questions: QuizQuestion[],
  explanations: (string | null)[]
): Promise<{ ok: Record<number, boolean>; note: string }> {
  const ok: Record<number, boolean> = {};
  const reqIdx = questions
    .map((q, i) => (q.type === "choice" ? i : -1))
    .filter((i) => i >= 0);
  if (reqIdx.length === 0) return { ok, note: "" };

  const lines = reqIdx.map((i) => {
    const q = questions[i] as Extract<QuizQuestion, { type: "choice" }>;
    return `题${i + 1}：${q.question}\n选项：${q.options.join(" / ")}\n学生的选择：${q.options[Number(explanations[i] ?? -1)] ?? "未选"}\n学生的解释：${explanations[i] ?? "（未填写）"}`;
  });

  const prompt = `你是严格的考研数学老师。下面是学生选择题的作答与解释。请判断每个解释是否真正体现了理解（有推理过程、能说明为什么对/为什么其他选项错），而不是蒙对或复述选项。
要求：每题只输出一行，格式：题号|通过|原因（通过/不通过，原因一句话）
${lines.join("\n\n")}`;

  try {
    const raw = await chat([{ role: "user", content: prompt }]);
    let parsed = 0;
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*(\d+)\s*[|：:]\s*(通过|不通过|未通过)\s*[|：:]\s*(.*)$/);
      if (!m) continue;
      const idx = Number(m[1]) - 1;
      ok[idx] = m[2] === "通过";
      parsed++;
    }
    if (parsed < reqIdx.length) {
      return { ok, note: `（AI 解析不完整 ${parsed}/${reqIdx.length}，未解析的题按通过处理）` };
    }
    return { ok, note: "" };
  } catch {
    return { ok: {}, note: "（AI 不可用，本次解释不判分）" };
  }
}

// POST：提交作答 + 解释，服务端判分（答案 + 理解双重判定）
export async function POST(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const lessonSlug = decodeURIComponent(slug);
  const quiz = getQuiz(lessonSlug);
  if (!quiz) return NextResponse.json({ error: "该课程没有关卡" }, { status: 404 });

  const body = await req.json();
  const answers = (body.answers ?? []) as (string | number | null)[];
  const explanations = (body.explanations ?? []) as (string | null)[];
  const seed = Number(body.seed ?? 0);
  const practice = body.practice === true; // 练习模式：判分但不写库

  const { questions } = pickVariant(quiz, seed);

  // 答案判分
  const results = questions.map((q, i) => {
    const given = answers[i] ?? null;
    const correct = checkAnswer(q, given);
    return {
      index: i,
      type: q.type,
      question: q.question,
      given,
      correct,
      correct_answer: q.type === "choice" ? q.options[q.answer] : q.answer.join(" 或 "),
      explanation: q.explanation,
      needs_explanation: q.type === "choice",
    };
  });

  const score = results.filter((r) => r.correct).length;
  const total = questions.length;
  const percent = Math.round((score / total) * 100);

  // 理解判分（AI 审查解释）
  const { ok: explainOk, note: explainNote } = await gradeExplanations(questions, explanations);
  const reqCount = results.filter((r) => r.needs_explanation).length;
  const explainPass = reqCount
    ? results.filter((r) => r.needs_explanation && explainOk[r.index] !== false).length
    : 0;
  const explainRate = reqCount ? Math.round((explainPass / reqCount) * 100) : 100;

  // 过关 = 答对率达标 且 理解率达标
  const passPercent = quiz.pass_percent ?? 70;
  const passed = percent >= passPercent && explainRate >= passPercent;
  const stars = passed ? calcStars(Math.min(percent, explainRate), passPercent) : 0;

  const r = practice
    ? { lastInsertRowid: 0 }
    : db
        .prepare(
          `INSERT INTO quiz_attempts (lesson_slug, score, total, percent, stars, passed, answers, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          lessonSlug,
          score,
          total,
          percent,
          stars,
          passed ? 1 : 0,
          JSON.stringify({ answers, explanations, seed, explainRate }),
          new Date().toISOString()
        );

  if (!practice && passed) {
    db.prepare(
      `INSERT INTO progress (lesson_slug, done, updated_at) VALUES (?, 1, ?)
       ON CONFLICT(lesson_slug) DO UPDATE SET done = 1, updated_at = excluded.updated_at`
    ).run(lessonSlug, new Date().toISOString());
  }

  // 📝 自动整理错题本：答错 / 疑似蒙对的题自动入库（零手动录入；练习模式不写库）
  const lesson = getLesson(lessonSlug);
  const subject = lesson?.meta.subject ?? "";
  const chapter = lesson?.meta.chapter ?? "";
  const findMistake = db.prepare("SELECT id FROM mistakes WHERE question = ?");
  const addMistake = db.prepare(
    `INSERT INTO mistakes (subject, chapter, question, my_answer, right_answer, wrong_reason, ai_analysis, status, options, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  );
  if (!practice) {
    for (const res of results) {
      const guessed =
        res.correct && res.needs_explanation && explainOk[res.index] === false;
      if (res.correct && !guessed) continue; // 真对的跳过
      if (findMistake.get(res.question)) continue; // 已存在跳过（去重）
      const myAnswer =
        res.type === "choice" && res.given !== null
          ? (questions[res.index] as Extract<QuizQuestion, { type: "choice" }>).options?.[
              Number(res.given)
            ] ?? String(res.given)
          : String(res.given ?? "未作答");
      addMistake.run(
        subject,
        chapter,
        res.question,
        myAnswer,
        res.correct_answer,
        guessed ? "闯关答对但解释不过关（疑似蒙对）" : "闯关测试答错",
        res.explanation,
        res.type === "choice"
          ? JSON.stringify(
              (questions[res.index] as Extract<QuizQuestion, { type: "choice" }>).options
            )
          : "",
        new Date().toISOString()
      );
    }
  }

  return NextResponse.json({
    attempt_id: Number(r.lastInsertRowid),
    score,
    total,
    percent,
    explain_rate: explainRate,
    explain_note: explainNote,
    stars,
    passed,
    pass_percent: passPercent,
    // 下一关（学习流：通关后直达）
    next: !practice
      ? getNextLevel(lessonSlug)
      : null,
    results: results.map((res) => ({
      ...res,
      explain_ok: res.needs_explanation ? explainOk[res.index] !== false : null,
      // 答对但解释不过关 = 蒙的
      guessed: res.correct && res.needs_explanation && explainOk[res.index] === false,
    })),
  });
}
