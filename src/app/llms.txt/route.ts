import { NextResponse } from "next/server";
import { listLessons } from "@/lib/course";

// llms.txt — 面向 LLM/AI 的站点索引（llmstxt.org 约定）
export async function GET() {
  const lessons = listLessons();
  const lines: string[] = [];
  lines.push("# AI 考研助教 (ai-kaoyan-tutor)");
  lines.push("");
  lines.push("> 11408 考生（数学一 + 英语一 + 政治 + 408 统考）的 AI 备考学习站。");
  lines.push("> 课程按 数学一 → 408 → 英语一 → 政治 顺序授课，内容开源（MIT）。");
  lines.push("");
  lines.push("## 关键文档");
  lines.push("");
  lines.push("- [教学大纲（无遗漏契约，含全部知识点）](https://raw.githubusercontent.com/SBChahaha/ai-kaoyan-tutor/main/content/curriculum.md)");
  lines.push("- [README](https://raw.githubusercontent.com/SBChahaha/ai-kaoyan-tutor/main/README.md)");
  lines.push("");
  lines.push("## 课程（按科目与章节组织，共 " + lessons.length + " 课）");
  lines.push("");
  let currentSubject = "";
  for (const l of lessons) {
    if (l.subject !== currentSubject) {
      currentSubject = l.subject;
      lines.push("### " + l.subject);
      lines.push("");
    }
    lines.push("- [" + l.title + "](/course/" + encodeURIComponent(l.slug) + ")");
  }
  lines.push("");
  lines.push("## 机器可读 API（学习状态检查）");
  lines.push("");
  lines.push("- GET /api/status — 学习状态摘要（课程进度、作业数、待复习错题）");
  lines.push("- GET /api/course — 课程清单（slug/title/科目/章节）");
  lines.push("- GET /api/progress — 课程完成进度（lesson_slug → done）");
  lines.push("- GET /api/homework — 作业提交与 AI 批改记录");
  lines.push("- GET /api/notes — 笔记；GET /api/mistakes — 错题；GET /api/logs — 学习日志");
  lines.push("");
  lines.push("## 内容存放");
  lines.push("");
  lines.push("课程讲义为 markdown 文件，位于 GitHub 仓库 content/lessons/ 目录（按科目/章节组织），可直接读取全文。");
  lines.push("");
  lines.push("数据存储于 SQLite（data/kaoyan.db），进度与作业均保存在服务器端。");

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
