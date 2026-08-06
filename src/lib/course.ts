// 课程内容加载层：读取 content/lessons/ 下的 markdown 课程文件
import fs from "node:fs";
import path from "node:path";
import { SUBJECTS } from "@/lib/config";

const LESSONS_ROOT = path.join(process.cwd(), "content", "lessons");

export type LessonMeta = {
  slug: string;
  title: string;
  subject: string;
  chapter: string;
  order: number;
  file: string;
};

export type Lesson = { meta: LessonMeta; content: string };

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// 科目顺序 + 章节顺序由 config 决定，保证目录稳定
const subjectOrder = new Map(SUBJECTS.map((s, i) => [s.name, i]));
const chapterOrder = new Map<string, number>();
for (const s of SUBJECTS) {
  s.chapters.forEach((c, i) => chapterOrder.set(`${s.name}/${c}`, i));
}

export function listLessons(): LessonMeta[] {
  const metas: LessonMeta[] = [];
  for (const file of walk(LESSONS_ROOT)) {
    const raw = fs.readFileSync(file, "utf-8");
    const { meta } = parseFrontmatter(raw);
    const subject = meta.subject ?? "";
    const chapter = meta.chapter ?? "";
    const order = Number(meta.order ?? 0);
    const slug = path.basename(file, ".md");
    metas.push({ slug, title: meta.title ?? slug, subject, chapter, order, file });
  }
  metas.sort((a, b) => {
    const sa = subjectOrder.get(a.subject) ?? 999;
    const sb = subjectOrder.get(b.subject) ?? 999;
    if (sa !== sb) return sa - sb;
    const ca = chapterOrder.get(`${a.subject}/${a.chapter}`) ?? 999;
    const cb = chapterOrder.get(`${b.subject}/${b.chapter}`) ?? 999;
    if (ca !== cb) return ca - cb;
    return a.order - b.order;
  });
  return metas;
}

export function getLesson(slug: string): Lesson | null {
  for (const file of walk(LESSONS_ROOT)) {
    if (path.basename(file, ".md") === slug) {
      const raw = fs.readFileSync(file, "utf-8");
      const { meta, body } = parseFrontmatter(raw);
      return {
        meta: {
          slug,
          title: meta.title ?? slug,
          subject: meta.subject ?? "",
          chapter: meta.chapter ?? "",
          order: Number(meta.order ?? 0),
          file,
        },
        content: body,
      };
    }
  }
  return null;
}

export function groupByChapter(lessons: LessonMeta[]) {
  const groups: { subject: string; chapter: string; lessons: LessonMeta[] }[] = [];
  for (const l of lessons) {
    const key = `${l.subject}/${l.chapter}`;
    const g = groups.find((x) => `${x.subject}/${x.chapter}` === key);
    if (g) g.lessons.push(l);
    else groups.push({ subject: l.subject, chapter: l.chapter, lessons: [l] });
  }
  return groups;
}
