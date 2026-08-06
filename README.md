# AI 考研助教 (ai-kaoyan-tutor)

> 一个 11408 考生的 AI 备考学习站：AI 授课内容的结构化沉淀 + AI 答疑 + 错题本 + 学习追踪。
> 开源项目，第一用户是它的作者 —— 学习优先，网站其次：内容来自学习，学习不服务于网站。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![SQLite](https://img.shields.io/badge/SQLite-node:sqlite-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 功能

| 模块 | 说明 |
|------|------|
| 🏠 **首页** | 考研倒计时、今日计划勾选、错题/笔记统计、近 7 天学习时长 |
| 📚 **知识库** | 按 408 考纲 + 公共课章节组织的 Markdown 笔记，支持编辑/预览 |
| 🤖 **AI 答疑** | 对话式答疑，自动携带当前章节笔记作为上下文；错题一键 AI 解析 |
| ✍️ **错题本** | 录入错题（题目/我的答案/正确答案/错误原因），AI 生成解析，待复习/已复习状态管理 |
| 📝 **学习日志** | 每日学习时长与内容记录，累计时长统计 |

## 🚀 快速开始

要求：Node.js ≥ 22.13（使用内置 `node:sqlite`，零原生依赖）

```bash
# 1. 安装依赖
npm install

# 2. 配置 AI（可选，不配也能用其他功能）
cp .env.local.example .env.local   # 填入 DEEPSEEK_API_KEY

# 3. 初始化知识库（按考纲生成 50 个章节笔记）
npm run seed

# 4. 启动
npm run dev    # http://localhost:3000
```

## 🗂️ 项目结构

```
src/
├── app/
│   ├── page.tsx              # 首页：倒计时 + 计划 + 统计
│   ├── notes/                # 知识库（章节笔记编辑 + AI 梳理）
│   ├── chat/                 # AI 答疑
│   ├── mistakes/             # 错题本
│   ├── logs/                 # 学习日志
│   └── api/                  # REST API（notes/mistakes/logs/plans/chat）
├── lib/
│   ├── db.ts                 # SQLite 数据层（node:sqlite）
│   ├── llm.ts                # LLM 调用层（默认 DeepSeek）
│   └── config.ts             # 考试日期、科目章节配置
└── scripts/seed.ts           # 种子脚本
```

数据存储在 `data/kaoyan.db`（SQLite 单文件，已 gitignore）。

## 🔧 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `DEEPSEEK_API_KEY` | - | DeepSeek API Key（platform.deepseek.com） |
| `LLM_BASE_URL` | `https://api.deepseek.com` | 可切换任意 OpenAI 兼容服务 |
| `LLM_MODEL` | `deepseek-chat` | 模型名 |

## 🗺️ 路线图

- [ ] 真题题库与演练
- [ ] 笔记 RAG 检索（全库语义搜索）
- [ ] 学习数据可视化（时长趋势/科目分布）
- [ ] 部署脚本（Vercel + Neon）
- [ ] 多用户支持（考后）

## ⚠️ 内容声明

AI 生成内容可能出错。涉及 408 考点请以统考大纲和王道考研辅导书为准；真题引用注明出处，解析为原创。

## 📄 License

MIT
