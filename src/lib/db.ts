// 数据库层：node:sqlite（Node 22 内置，零原生依赖）
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "kaoyan.db");

// 防止 Next.js 开发模式 HMR 重复打开连接
const g = globalThis as unknown as { __db?: DatabaseSync };
if (!g.__db) {
  g.__db = new DatabaseSync(DB_PATH);
  g.__db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL,
      title TEXT NOT NULL,
      content_md TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL DEFAULT '',
      question TEXT NOT NULL,
      my_answer TEXT NOT NULL DEFAULT '',
      right_answer TEXT NOT NULL DEFAULT '',
      wrong_reason TEXT NOT NULL DEFAULT '',
      ai_analysis TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending', -- pending / reviewed
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      content TEXT NOT NULL DEFAULT '',
      plan_tomorrow TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      task TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS progress (
      lesson_slug TEXT PRIMARY KEY,
      done INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_slug TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      answer TEXT NOT NULL,
      feedback TEXT NOT NULL DEFAULT '',
      score INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_slug TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percent INTEGER NOT NULL,
      stars INTEGER NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      answers TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
    CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject);
    CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
    CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
  `);
}
export const db = g.__db;

export type Note = {
  id: number;
  subject: string;
  chapter: string;
  title: string;
  content_md: string;
  updated_at: string;
};

export type Mistake = {
  id: number;
  subject: string;
  chapter: string;
  question: string;
  my_answer: string;
  right_answer: string;
  wrong_reason: string;
  ai_analysis: string;
  status: string;
  created_at: string;
};

export function getNotes(subject?: string): Note[] {
  if (subject) {
    return db
      .prepare("SELECT * FROM notes WHERE subject = ? ORDER BY id")
      .all(subject) as unknown as Note[];
  }
  return db.prepare("SELECT * FROM notes ORDER BY subject, id").all() as unknown as Note[];
}

export function getNote(id: number): Note | undefined {
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as unknown as Note | undefined;
}

export function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
