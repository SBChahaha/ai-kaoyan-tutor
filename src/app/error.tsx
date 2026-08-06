"use client";

// 全局错误边界：页面崩溃不白屏
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-7xl">💥</div>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">出错了</h1>
      <p className="mt-2 text-sm text-slate-500">
        {error.message || "页面运行时出了点问题，不影响你的学习数据"}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          🔄 重试
        </button>
        <a
          href="/"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          🏠 回首页
        </a>
      </div>
    </div>
  );
}
