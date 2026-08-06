// 种子脚本：按考纲为每个章节创建初始笔记
// 运行：npm run seed
import { db } from "../src/lib/db.ts";
import { SUBJECTS } from "../src/lib/config.ts";

const row = db.prepare("SELECT COUNT(*) AS c FROM notes").get() as { c: number };
if (row.c > 0) {
  console.log(`笔记表已有 ${row.c} 条数据，跳过种子。`);
  process.exit(0);
}

const ins = db.prepare(
  "INSERT INTO notes (subject, chapter, title, content_md, updated_at) VALUES (?, ?, ?, ?, ?)"
);
const now = new Date().toISOString();
let n = 0;
for (const s of SUBJECTS) {
  for (const ch of s.chapters) {
    ins.run(
      s.name,
      ch,
      ch,
      `# ${ch}

> 学习日期：
> 掌握程度：□ 未开始 □ 进行中 □ 已掌握

## 考点总结

## AI 讲解（粘贴 AI 授课内容）

## 我的理解（用自己的话复述）

## 高频考点 / 真题链接

## 待复习问题
`,
      now
    );
    n++;
  }
}
console.log(`✅ 已播种 ${n} 个章节笔记（${SUBJECTS.length} 个科目）`);
