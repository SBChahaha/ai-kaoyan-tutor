// LLM 调用层：默认 DeepSeek API，可用环境变量覆盖
const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.LLM_MODEL || "deepseek-chat";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: ChatMsg[]): Promise<string> {
  if (!API_KEY) {
    return "⚠️ 未配置 DEEPSEEK_API_KEY。请在项目根目录的 .env.local 中填入你的 API Key（https://platform.deepseek.com 获取）。";
  }
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM 调用失败 (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

export const SYSTEM_PROMPT = `你是"AI 考研助教"，帮助 11408（数学一 + 英语一 + 政治 + 408 计算机统考）考生备考。
规则：
1. 讲解要清晰、结构化，多用例子，中文回答。
2. 涉及 408 考点时，以统考大纲和王道考研辅导书为准；不确定的内容要明确说明。
3. 用户贴出题目时，先给出解题思路，再给答案，最后指出常见错误。
4. 不要替用户写答案——引导他先思考；但用户明确要求"直接讲解"时可以完整讲解。
5. 回答保持精炼，控制在合理篇幅。`;
