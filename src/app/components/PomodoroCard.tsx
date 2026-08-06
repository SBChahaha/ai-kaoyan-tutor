"use client";

import { useEffect, useRef, useState } from "react";

// 🍅 番茄专注计时器：默认 25 分钟一轮，时长可调，完成自动记入学习时长
const DURATIONS = [15, 25, 45];

export default function PomodoroCard() {
  const [minutes, setMinutes] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 时长偏好持久化
  useEffect(() => {
    const saved = Number(localStorage.getItem("pomodoro_minutes") ?? 25);
    if (DURATIONS.includes(saved)) {
      setMinutes(saved);
      setLeft(saved * 60);
    }
  }, []);

  function setDuration(m: number) {
    setMinutes(m);
    setLeft(m * 60);
    setRunning(false);
    localStorage.setItem("pomodoro_minutes", String(m));
  }

  useEffect(() => {
    // 今日番茄数（从日志统计）
    fetch("/api/logs")
      .then((r) => r.json())
      .then((rows: { content: string }[]) => {
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, "0");
        const t = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        setTodayCount(rows.filter((r) => r.content.includes("🍅")).length);
      });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setLeft((s) => {
          if (s <= 1) {
            complete();
            return minutes * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function complete() {
    setRunning(false);
    setSessions((s) => s + 1);
    setTodayCount((c) => c + 1);
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        hours: minutes / 60,
        content: "🍅 番茄专注完成一轮（25 分钟）",
      }),
    });
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = ((minutes * 60 - left) / (minutes * 60)) * 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">🍅 专注计时器</h2>
        <span className="text-xs text-slate-400">
          今日 {todayCount} 轮 · 每轮自动记 {minutes} 分钟学习        </span>
      </div>
      <div className="flex items-center gap-4">
        {/* 圆环进度 */}
        <div
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#ef4444 ${pct * 3.6}deg, #f1f5f9 0deg)`,
          }}
        >
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-bold tabular-nums">
              {mm}:{ss}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500">
            {running
              ? "专注中，别碰手机 📵"
              : left === minutes * 60
                ? `准备好就开始 ${minutes} 分钟专注`
                : sessions > 0
                  ? `本轮完成 ✅ 共 ${sessions} 轮，休息 5 分钟`
                  : `准备好就开始 ${minutes} 分钟专注`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!running ? (
              <>
                <button
                  onClick={() => {
                    setLeft(minutes * 60);
                    setRunning(true);
                  }}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  ▶ 开始专注
                </button>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1">
                  {DURATIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setDuration(m)}
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                        minutes === m ? "bg-red-100 text-red-700" : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {m}′
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                onClick={() => setRunning(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                ⏸ 暂停
              </button>
            )}
            <button
              onClick={() => {
                setRunning(false);
                setLeft(minutes * 60);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ↺ 重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
