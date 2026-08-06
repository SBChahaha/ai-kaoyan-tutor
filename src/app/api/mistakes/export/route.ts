import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// 错题本导出为 Markdown（离线打印复习）
export async function GET() {
  const rows = db.prepare("SELECT * FROM mistakes ORDER BY subject, created_at").all() as unknown as {
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
  }[];

  const lines: string[] = [
    "# 错题本导出",
    "",
    `> 导出时间：${new Date().toLocaleString("zh-CN")} ｜ 共 ${rows.length} 道`,
    "",
  ];

  let currentSubject = "";
  for (const m of rows) {
    if (m.subject !== currentSubject) {
      currentSubject = m.subject;
      lines.push(`## ${m.subject}`, "");
    }
    lines.push(
      `### ${m.question}`,
      "",
      `- **章节**：${m.chapter || "—"}`,
      `- **我的答案**：${m.my_answer || "—"}`,
      `- **正确答案**：${m.right_answer || "—"}`,
      `- **错误原因**：${m.wrong_reason || "—"}`,
      `- **状态**：${m.status === "pending" ? "待复习" : "已复习"}`,
      `- **日期**：${m.created_at?.slice(0, 10) ?? "—"}`,
      "",
      m.ai_analysis ? `**解析**：${m.ai_analysis}` : "",
      "",
      "---",
      ""
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mistakes.md"',
    },
  });
}
