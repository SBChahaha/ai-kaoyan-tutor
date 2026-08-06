import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, type ChatMsg } from "@/lib/llm";
import { buildContextMessages } from "@/lib/context";

export const runtime = "nodejs";

const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.LLM_MODEL || "deepseek-chat";

// 流式答疑：SSE 输出（打字机效果）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { question, noteId, history } = body as {
    question: string;
    noteId?: number;
    history?: { role: string; content: string }[];
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
  }
  if (String(question).length > 4000) {
    return NextResponse.json({ error: "问题太长了（最多 4000 字）" }, { status: 400 });
  }
  if (!API_KEY) {
    return new NextResponse("⚠️ 未配置 DEEPSEEK_API_KEY。请在项目根目录的 .env.local 中填入你的 API Key（https://platform.deepseek.com 获取）。", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const hist = (history ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8) as ChatMsg[];

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...buildContextMessages(question, noteId, hist),
  ];

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    return new NextResponse("⚠️ 网络错误，请重试", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!upstream.ok || !upstream.body) {
    return new NextResponse(`⚠️ LLM 调用失败 (${upstream.status})`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta = j?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(new TextEncoder().encode(delta));
            } catch {
              /* 忽略不完整行 */
            }
          }
        }
      } catch {
        /* 客户端断开 */
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
