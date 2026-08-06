import Link from "next/link";

// 404：学习风迷路页
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-7xl">🦉</div>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">404 · 这页不存在</h1>
      <p className="mt-2 text-sm text-slate-500">
        这道题超纲了——可能链接失效，或者页面还在"打草稿"。
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          🏠 回首页
        </Link>
        <Link
          href="/course"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          📖 去课程
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-400">
        按 <kbd className="rounded border border-slate-300 bg-slate-50 px-1 font-mono">?</kbd> 可以查看全站快捷键
      </p>
    </div>
  );
}
