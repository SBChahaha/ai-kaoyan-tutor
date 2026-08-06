import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 学习数据 CSV 导出（Excel 可直接打开）
function csvCell(s: string): string {
  const v = String(s ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${v}"`;
}

function download(name: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map((c) => csvCell(String(c))).join(","));
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "logs";

  if (type === "mistakes") {
    const rows = db
      .prepare("SELECT * FROM mistakes ORDER BY created_at")
      .all() as unknown as Record<string, string>[];
    return download("mistakes", ["id", "科目", "章节", "题目", "我的答案", "正确答案", "错误原因", "解析", "状态", "日期"], rows.map((r) => [r.id, r.subject, r.chapter, r.question, r.my_answer, r.right_answer, r.wrong_reason, r.ai_analysis, r.status === "pending" ? "待复习" : "已复习", r.created_at?.slice(0, 10)]));
  }

  if (type === "attempts") {
    const rows = db
      .prepare("SELECT * FROM quiz_attempts ORDER BY id")
      .all() as unknown as Record<string, string>[];
    return download("quiz-attempts", ["id", "关卡", "得分", "总数", "正确率%", "星级", "是否过关", "时间"], rows.map((r) => [r.id, r.lesson_slug, r.score, r.total, r.percent, r.stars, r.passed ? "是" : "否", r.created_at?.slice(0, 16)]));
  }

  // 默认 logs
  const rows = db
    .prepare("SELECT * FROM logs ORDER BY date DESC, id DESC")
    .all() as unknown as Record<string, string>[];
  return download("logs", ["id", "日期", "时长h", "内容", "记录时间"], rows.map((r) => [r.id, r.date, r.hours, r.content, r.created_at]));
}
